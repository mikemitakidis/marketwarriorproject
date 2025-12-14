import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess, logActivity } from '@/lib/api-middleware';
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

    // Get correct answers from database (SERVER-SIDE ONLY)
    const { data: content } = await supabase
      .from('course_content')
      .select('quiz_answers, quiz_questions')
      .eq('day_number', dayNumber)
      .single();

    if (!content?.quiz_answers) {
      return errorResponse('Quiz not found', 404);
    }

    const correctAnswers = content.quiz_answers;
    const totalQuestions = correctAnswers.length;

    if (totalQuestions === 0) {
      return errorResponse('No questions for this day', 400);
    }

    // Calculate score - SERVER SIDE VALIDATION
    let correctCount = 0;
    const results = {};

    for (let i = 0; i < totalQuestions; i++) {
      const questionNum = i + 1;
      const userAnswer = answers[questionNum]?.toLowerCase();
      const correctAnswer = correctAnswers[i]?.toLowerCase();

      if (userAnswer === correctAnswer) {
        correctCount++;
        results[questionNum] = 'correct';
      } else {
        results[questionNum] = 'incorrect';
      }
    }

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
      answers_submitted: answers,
      score: score,
      passed: passed,
      attempt_number: (attemptCount || 0) + 1
    });

    // Update challenge progress if passed
    if (passed) {
      await supabase.from('challenge_progress').upsert({
        user_id: user.id,
        day_number: dayNumber,
        quiz_completed: true,
        quiz_score: score,
        quiz_passed: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,day_number' });

      // If task is also completed, unlock next day
      const { data: currentProgress } = await supabase
        .from('challenge_progress')
        .select('task_completed')
        .eq('user_id', user.id)
        .eq('day_number', dayNumber)
        .single();

      if (currentProgress?.task_completed && dayNumber < 30) {
        // Unlock next day
        await supabase.from('challenge_progress').upsert({
          user_id: user.id,
          day_number: dayNumber + 1,
          unlocked_at: new Date().toISOString()
        }, { onConflict: 'user_id,day_number' });
      }
    }

    // Log activity
    await logActivity(user.id, 'quiz_submit', {
      day: dayNumber,
      score: score,
      passed: passed,
      attempt: (attemptCount || 0) + 1
    });

    return jsonResponse({
      score,
      passed,
      correct_count: correctCount,
      total_questions: totalQuestions,
      threshold: PASS_THRESHOLD,
      results: passed ? results : undefined, // Only show detailed results if passed
      message: passed 
        ? `Congratulations! You passed with ${score}%!`
        : `You scored ${score}%. You need ${PASS_THRESHOLD}% to pass. Try again!`
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return errorResponse('Failed to submit quiz', 500);
  }
}
