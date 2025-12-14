import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createAdminSupabase();

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('challenge_start_date, is_paid, access_expires_at')
      .eq('id', user.id)
      .single();

    if (!profile?.is_paid) {
      return errorResponse('Payment required', 403);
    }

    // Check if access expired
    if (profile.access_expires_at) {
      const expiresAt = new Date(profile.access_expires_at);
      if (expiresAt < new Date()) {
        return errorResponse('Access expired', 403);
      }
    }

    // Get all progress records
    const { data: progressRecords } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('day_number', { ascending: true });

    const progressMap = {};
    (progressRecords || []).forEach(p => {
      progressMap[p.day_number] = p;
    });

    // Build days array with unlock status using SERVER TIME
    const startDate = profile.challenge_start_date ? new Date(profile.challenge_start_date) : null;
    const now = new Date();
    const days = [];

    for (let dayNum = 1; dayNum <= 30; dayNum++) {
      const progress = progressMap[dayNum] || {};
      const isCompleted = progress.quiz_passed && progress.task_completed;

      let unlocked = false;
      let unlocks_at = null;

      if (dayNum === 1) {
        // Day 1 always unlocked if challenge started
        unlocked = !!startDate;
      } else if (startDate) {
        // Check if previous day is completed
        const prevProgress = progressMap[dayNum - 1];
        const prevCompleted = prevProgress?.quiz_passed && prevProgress?.task_completed;

        if (prevCompleted) {
          // Check time lock
          const unlockTime = new Date(startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000);
          unlocked = now >= unlockTime;
          if (!unlocked) {
            unlocks_at = unlockTime.toISOString();
          }
        }
      }

      days.push({
        day_number: dayNum,
        unlocked,
        unlocks_at,
        completed: isCompleted,
        quiz_completed: progress.quiz_completed || false,
        quiz_passed: progress.quiz_passed || false,
        quiz_score: progress.quiz_score || null,
        task_completed: progress.task_completed || false
      });
    }

    // Calculate stats
    const completedDays = days.filter(d => d.completed).length;
    const currentDay = days.find(d => d.unlocked && !d.completed)?.day_number || (completedDays < 30 ? completedDays + 1 : 30);

    return jsonResponse({
      days,
      stats: {
        completed_days: completedDays,
        current_day: currentDay,
        progress_percent: Math.round((completedDays / 30) * 100),
        challenge_start_date: profile.challenge_start_date,
        access_expires_at: profile.access_expires_at
      }
    });
  } catch (error) {
    console.error('Progress status error:', error);
    return errorResponse('Failed to get progress', 500);
  }
}
