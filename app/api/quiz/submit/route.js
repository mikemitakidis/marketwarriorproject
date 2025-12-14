import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

const PASS_THRESHOLD = 60; // 60% to pass

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { day_number, answers } = body;

    if (!day_number || !answers || typeof answers !== 'object') {
      return errorResponse('Invalid submission', 400);
    }

    const dayNumber = parseInt(day_number);
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
      return errorResponse('Invalid day number', 400);
    }

    const supabase = createAdminSupabase();

    // Verify user has paid access
    const hasPaid = await hasUserPaidAccess(user.id);
    if (!hasPaid) {
      return errorResponse('Payment required', 403);
    }

    // Get quiz questions with correct answers from database (SERVER-SIDE ONLY)
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, question_order, correct_answer, explanation')
      .eq('day_number', dayNumber)
      .order('question_order', { ascending: true });

    if (!questions || questions.length === 0) {
      return errorResponse('Quiz not found for this day', 404);
    }

    const totalQuestions = questions.length;

    // Calculate score - SERVER SIDE VALIDATION
    let correctCount = 0;
    const results = {};
    const explanations = {};

    questions.forEach((question, index) => {
      const questionId = question.id;
      const userAnswer = parseInt(answers[questionId]);
      const correctAnswer = question.correct_answer;

      if (userAnswer === correctAnswer) {
        correctCount++;
        results[questionId] = 'correct';
      } else {
        results[questionId] = 'incorrect';
      }
      explanations[questionId] = question.explanation;
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= PASS_THRESHOLD;

    // Get attempt number
    const { count: attemptCount } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('day_number', dayNumber);

    // Record quiz attempt
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      day_number: dayNumber,
      answers: answers,
      score: score,
      passed: passed,
      correct_count: correctCount,
      total_questions: totalQuestions,
      completed_at: new Date().toISOString()
    });

    // Update challenge progress if passed
    if (passed) {
      // Check if progress record exists
      const { data: existingProgress } = await supabase
        .from('challenge_progress')
        .select('id, task_completed')
        .eq('user_id', user.id)
        .eq('day_number', dayNumber)
        .single();

      if (existingProgress) {
        // Update existing record
        await supabase
          .from('challenge_progress')
          .update({
            quiz_passed: true,
            quiz_score: score,
            quiz_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        // Insert new record
        await supabase.from('challenge_progress').insert({
          user_id: user.id,
          day_number: dayNumber,
          quiz_passed: true,
          quiz_score: score,
          quiz_completed_at: new Date().toISOString(),
          unlocked: true,
          unlocked_at: new Date().toISOString()
        });
      }

      // Update user's current day
      await supabase
        .from('user_profiles')
        .update({ 
          current_day: dayNumber,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }

    return jsonResponse({
      score,
      passed,
      correct_count: correctCount,
      total_questions: totalQuestions,
      threshold: PASS_THRESHOLD,
      results: results,
      explanations: passed ? explanations : undefined,
      message: passed 
        ? 'Congratulations! You passed with ' + score + '%!'
        : 'You scored ' + score + '%. You need ' + PASS_THRESHOLD + '% to pass. Try again!'
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return errorResponse('Failed to submit quiz', 500);
  }
}
