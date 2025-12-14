import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request, { params }) {
  const dayNumber = parseInt(params.day);

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
    return NextResponse.json({ error: 'Invalid day' }, { status: 400 });
  }

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

    // Get profile and verify payment + terms
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile?.has_paid) {
      return NextResponse.json({ error: 'Payment required' }, { status: 403 });
    }

    if (!profile?.agreed_to_terms) {
      return NextResponse.json({ error: 'Terms not accepted' }, { status: 403 });
    }

    // Check access expiry using SERVER time
    const serverNow = new Date();
    if (profile.access_expires_at && new Date(profile.access_expires_at) < serverNow) {
      return NextResponse.json({ error: 'Access expired' }, { status: 403 });
    }

    // Check if day is unlocked (server-side validation)
    if (dayNumber > 1) {
      const { data: prevProgress } = await supabase
        .from('challenge_progress')
        .select('completed, completed_at')
        .eq('user_id', user.id)
        .eq('day_number', dayNumber - 1)
        .single();

      if (!prevProgress?.completed) {
        return NextResponse.json({ error: 'Previous day not completed' }, { status: 403 });
      }

      // Check 24-hour unlock time
      const completedAt = new Date(prevProgress.completed_at);
      const unlockTime = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);
      if (serverNow < unlockTime) {
        return NextResponse.json({ error: 'Day not yet unlocked', unlock_at: unlockTime.toISOString() }, { status: 403 });
      }
    }

    // Get content
    const { data: content } = await supabase
      .from('course_content')
      .select('*')
      .eq('day_number', dayNumber)
      .single();

    // P0.1 FIX: Get quiz questions WITHOUT correct_answer - NEVER send answers to client
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, day_number, question, options, question_order, explanation')
      .eq('day_number', dayNumber)
      .order('question_order');

    // Remove any accidentally included sensitive fields
    const safeQuestions = (questions || []).map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      question_order: q.question_order
      // NO correct_answer, NO explanation until after submission
    }));

    // Get user progress for this day
    const { data: dayProgress } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .single();

    return NextResponse.json({
      day_number: dayNumber,
      title: content?.title || `Day ${dayNumber}`,
      subtitle: content?.subtitle,
      content_html: content?.content_html,
      youtube_video_id: content?.youtube_video_id,
      task_description: content?.task_description,
      task_steps: content?.task_steps,
      next_preview: content?.next_preview,
      quiz_questions: safeQuestions,
      progress: dayProgress || null,
      server_time: serverNow.toISOString()
    });

  } catch (err) {
    console.error('Day API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
