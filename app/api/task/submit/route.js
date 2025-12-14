import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess, logActivity } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { day_number, task_text, file_url } = body;

    const dayNumber = parseInt(day_number);
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
      return errorResponse('Invalid day number', 400);
    }

    if (!task_text?.trim() && !file_url) {
      return errorResponse('Please provide task response or file', 400);
    }

    const supabase = createAdminSupabase();

    // Verify user has paid access
    const hasPaid = await hasUserPaidAccess(user.id);
    if (!hasPaid) {
      return errorResponse('Payment required', 403);
    }

    // Check if task already submitted
    const { data: existingSubmission } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .single();

    if (existingSubmission) {
      // Update existing submission
      await supabase
        .from('task_submissions')
        .update({
          task_text: task_text?.trim() || null,
          file_url: file_url || null,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id);
    } else {
      // Create new submission
      await supabase.from('task_submissions').insert({
        user_id: user.id,
        day_number: dayNumber,
        task_text: task_text?.trim() || null,
        file_url: file_url || null,
        status: 'pending'
      });
    }

    // Mark day task as complete
    const now = new Date().toISOString();

    await supabase.from('challenge_progress').upsert({
      user_id: user.id,
      day_number: dayNumber,
      task_completed: true,
      updated_at: now
    }, { onConflict: 'user_id,day_number' });

    // Check if quiz is also passed, then mark day complete and unlock next
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('quiz_passed')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .single();

    if (progress?.quiz_passed) {
      // Day fully completed
      await supabase
        .from('challenge_progress')
        .update({ completed_at: now })
        .eq('user_id', user.id)
        .eq('day_number', dayNumber);

      // Unlock next day if not day 30
      if (dayNumber < 30) {
        await supabase.from('challenge_progress').upsert({
          user_id: user.id,
          day_number: dayNumber + 1,
          unlocked_at: now
        }, { onConflict: 'user_id,day_number' });
      }
    }

    // Log activity
    await logActivity(user.id, 'task_submit', {
      day: dayNumber,
      hasText: !!task_text,
      hasFile: !!file_url
    });

    // Check if this was Day 30 (course completion)
    if (dayNumber === 30 && progress?.quiz_passed) {
      await logActivity(user.id, 'course_completed', {});
    }

    return jsonResponse({
      success: true,
      day: dayNumber,
      message: dayNumber === 30 && progress?.quiz_passed
        ? 'Congratulations! You have completed the 30-Day Market Warrior Challenge!'
        : `Day ${dayNumber} task submitted!`
    });
  } catch (error) {
    console.error('Task submit error:', error);
    return errorResponse('Failed to submit task', 500);
  }
}
