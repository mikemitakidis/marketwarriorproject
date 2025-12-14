import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';
import { generateFingerprint, checkDeviceLimit } from '@/lib/fingerprint';

export async function GET(request, { params }) {
  try {
    const user = await getUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const dayNumber = parseInt(params.day);
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
      return errorResponse('Invalid day number', 400);
    }

    const supabase = createAdminSupabase();

    // Check if user has paid access
    const hasPaid = await hasUserPaidAccess(user.id);
    if (!hasPaid) {
      return errorResponse('Payment required', 403);
    }

    // Check device limit
    const fingerprint = generateFingerprint(request);
    const deviceCheck = await checkDeviceLimit(user.id, fingerprint);
    if (!deviceCheck.allowed) {
      return errorResponse(deviceCheck.message || 'Device limit reached', 403);
    }

    // Get user profile for challenge start date
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('challenge_start_date, agreed_to_terms, access_expires_at')
      .eq('user_id', user.id)
      .single();

    if (!profile?.agreed_to_terms) {
      return errorResponse('Please accept terms first', 403);
    }

    // Check if access expired
    if (profile.access_expires_at && new Date(profile.access_expires_at) < new Date()) {
      return errorResponse('Access has expired', 403);
    }

    // Check unlock status using server time
    const unlockStatus = await checkDayUnlock(supabase, user.id, dayNumber, profile.challenge_start_date);
    
    if (!unlockStatus.unlocked) {
      return errorResponse(unlockStatus.reason || 'Day is locked', 403);
    }

    // Get day content
    const { data: content } = await supabase
      .from('course_content')
      .select('day_number, title, subtitle, content_html, youtube_video_id, task_description, task_steps, next_preview')
      .eq('day_number', dayNumber)
      .single();

    if (!content) {
      return errorResponse('Day content not found', 404);
    }

    // Get quiz questions for this day (WITHOUT correct answers for security)
    const { data: quizQuestions } = await supabase
      .from('quiz_questions')
      .select('id, question_order, question, options, explanation')
      .eq('day_number', dayNumber)
      .order('question_order', { ascending: true });

    // Get user's progress for this day
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .single();

    // Get previous task submission if exists
    const { data: taskSubmission } = await supabase
      .from('task_submissions')
      .select('task_text, file_url')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .single();

    return jsonResponse({
      day_number: content.day_number,
      title: content.title,
      subtitle: content.subtitle,
      content_html: content.content_html,
      youtube_video_id: content.youtube_video_id,
      has_video: !!content.youtube_video_id,
      task_description: content.task_description,
      task_steps: content.task_steps,
      next_preview: content.next_preview,
      quiz_questions: quizQuestions || [],
      progress: progress || {
        quiz_completed: false,
        quiz_passed: false,
        task_completed: false
      },
      task_submission: taskSubmission || null
    });
  } catch (error) {
    console.error('Day API error:', error);
    return errorResponse('Failed to load day', 500);
  }
}

async function checkDayUnlock(supabase, userId, dayNumber, challengeStartDate) {
  // Day 1 is always unlocked after start
  if (dayNumber === 1) {
    return { unlocked: !!challengeStartDate };
  }

  if (!challengeStartDate) {
    return { unlocked: false, reason: 'Challenge not started' };
  }

  // Check if previous day is completed
  const { data: prevProgress } = await supabase
    .from('challenge_progress')
    .select('quiz_passed, task_completed')
    .eq('user_id', userId)
    .eq('day_number', dayNumber - 1)
    .single();

  if (!prevProgress?.quiz_passed || !prevProgress?.task_completed) {
    return { unlocked: false, reason: 'Complete previous day first' };
  }

  // Check time lock (24 hours per day using SERVER time)
  const startDate = new Date(challengeStartDate);
  const unlockTime = new Date(startDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now < unlockTime) {
    const hoursLeft = Math.ceil((unlockTime - now) / (1000 * 60 * 60));
    return {
      unlocked: false,
      reason: `Day unlocks in ${hoursLeft} hours`,
      unlocks_at: unlockTime.toISOString()
    };
  }

  return { unlocked: true };
}
