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

    const { day_number, task_text, file_url } = await request.json();
    const now = new Date().toISOString();

    // Save task submission
    await supabase.from('task_submissions').upsert({
      user_id: user.id,
      day_number,
      task_text,
      file_url,
      submitted_at: now
    }, { onConflict: 'user_id,day_number' });

    // Check if quiz is passed
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('quiz_passed')
      .eq('user_id', user.id)
      .eq('day_number', day_number)
      .single();

    // Mark day as completed if quiz passed
    if (progress?.quiz_passed) {
      await supabase
        .from('challenge_progress')
        .update({
          task_completed: true,
          task_submitted_at: now,
          completed: true,
          completed_at: now
        })
        .eq('user_id', user.id)
        .eq('day_number', day_number);

      // Unlock next day
      if (day_number < 30) {
        const unlockTime = new Date();
        unlockTime.setHours(unlockTime.getHours() + 24);
        
        await supabase.from('challenge_progress').upsert({
          user_id: user.id,
          day_number: day_number + 1,
          unlocked: true,
          unlocked_at: unlockTime.toISOString()
        }, { onConflict: 'user_id,day_number' });
      }

      // Update profile
      await supabase
        .from('user_profiles')
        .update({
          current_day: day_number + 1,
          days_completed: day_number,
          course_completed: day_number >= 30,
          course_completed_at: day_number >= 30 ? now : null
        })
        .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true, completed: progress?.quiz_passed });

  } catch (err) {
    console.error('Task submit error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
