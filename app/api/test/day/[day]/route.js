import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TEST ONLY - Uses service key to bypass all security
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
    // Get course content
    const { data: content, error: contentError } = await supabase
      .from('course_content')
      .select('*')
      .eq('day_number', dayNumber)
      .single();

    if (contentError && contentError.code !== 'PGRST116') {
      console.error('Content error:', contentError);
    }

    // Get quiz questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('day_number', dayNumber)
      .order('question_order', { ascending: true });

    if (questionsError) {
      console.error('Questions error:', questionsError);
    }

    return NextResponse.json({
      day_number: dayNumber,
      title: content?.title || `Day ${dayNumber}`,
      subtitle: content?.subtitle || '',
      content_html: content?.content_html || null,
      youtube_video_id: content?.youtube_video_id || null,
      task_description: content?.task_description || null,
      task_steps: content?.task_steps || null,
      next_preview: content?.next_preview || null,
      quiz_questions: questions || [],
      _test_mode: true
    });

  } catch (err) {
    console.error('Test API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
