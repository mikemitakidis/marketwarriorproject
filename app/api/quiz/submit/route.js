import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { day_number, answers } = await request.json();

    // Get correct answers from database
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer, explanation')
      .eq('day_number', day_number)
      .order('question_order');

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found' }, { status: 404 });
    }

    // Score the quiz
    let correctCount = 0;
    const results = questions.map((q, i) => {
      const userAnswer = answers[i];
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correctCount++;
      return {
        question_id: q.id,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 60;
    const now = new Date().toISOString();

    // Save quiz result
    await supabase.from('quiz_results').insert({
      user_id: user.id,
      day_number,
      score,
      passed,
      correct_count: correctCount,
      total_questions: questions.length,
      answers: results,
      completed_at: now
    });

    // Update progress
    const updateData = {
      user_id: user.id,
      day_number,
      quiz_score: score,
      quiz_passed: passed,
      quiz_completed_at: now
    };

    await supabase
      .from('challenge_progress')
      .upsert(updateData, { onConflict: 'user_id,day_number' });

    return NextResponse.json({
      score,
      passed,
      correct_count: correctCount,
      total_questions: questions.length,
      results
    });

  } catch (err) {
    console.error('Quiz submit error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
