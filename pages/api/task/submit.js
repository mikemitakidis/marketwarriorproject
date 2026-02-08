import { getServiceSupabase, getUserFromRequest, getGateStatus, getUserChallengeStatus } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';
import { checkAndFirePhaseEvent, sendLoopsEvent, LOOPS_EVENTS } from '../../../lib/loops';

/**
 * API route: /api/task/submit
 *
 * Accepts POST `{ day: number, response: string }` and records a
 * submission in `task_submissions`. Marks the day as completed and
 * unlocks the next day.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user first for rate limiting
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Apply rate limiting per user
  const identifier = getIdentifier(req, user.id);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.submission, identifier);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { day: rawDay, response: taskResponse, attachmentUrl, attachmentPath } = req.body;
    const day = Number(rawDay);
    if (!day || !taskResponse) {
      return res.status(400).json({ error: 'Missing day or response' });
    }
    if (!Number.isInteger(day) || day < 1 || day > 30) {
      return res.status(400).json({ error: 'Day must be a number between 1 and 30' });
    }

    // VALIDATION: Day 2+ requires file upload
    if (day >= 2 && !attachmentUrl) {
      return res.status(400).json({ error: 'File upload is required for Day 2 and beyond' });
    }

    const userId = user.id;
    const supabase = getServiceSupabase();

    // SECURITY: Verify payment status
    const gate = await getGateStatus(userId);
    if (!gate.hasPaid) {
      return res.status(403).json({ error: 'Payment required to submit tasks' });
    }

    // SECURITY: Verify day is unlocked
    const challengeStatus = await getUserChallengeStatus(userId);
    if (!challengeStatus.unlockedDays.includes(day)) {
      return res.status(403).json({ error: `Day ${day} is not unlocked yet` });
    }

    // Ensure quiz is passed before accepting task
    // Check quiz_attempts table (correct table from schema!)
    const { data: quizAttempt, error: quizErr } = await supabase
      .from('quiz_attempts')
      .select('score, max_score, passed')
      .eq('user_id', userId)
      .eq('day', day)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (quizErr || !quizAttempt) {
      return res.status(403).json({ error: 'Complete the quiz first' });
    }

    // Check if passed (60% threshold)
    const passed = quizAttempt.passed || (quizAttempt.max_score > 0 && quizAttempt.score / quizAttempt.max_score >= 0.6);
    if (!passed) {
      return res.status(403).json({ error: 'Pass the quiz (60%) before submitting the task' });
    }

    // Insert task submission (using correct column names from schema)
    const { error: insertErr } = await supabase
      .from('task_submissions')
      .insert({
        user_id: userId,
        day: day,
        submission_text: taskResponse,
        attachment_url: attachmentUrl || null,
        attachment_path: attachmentPath || null,
        status: 'submitted',
      });

    if (insertErr) {
      logger.error('Error saving task:', insertErr);
      return res.status(500).json({ error: 'Could not save task' });
    }

    // Mark current day as completed (use upsert in case row doesn't exist)
    const now = new Date().toISOString();
    await supabase
      .from('challenge_progress')
      .upsert({
        user_id: userId,
        day: day,
        completed: true,
        completed_at: now,
        task_submitted: true,
        unlocked: true,
      }, { onConflict: 'user_id,day' });

    // Unlock the next day (if exists in course_content)
    const nextDay = Number(day) + 1;
    if (nextDay <= 30) {
      // Check if next day content exists
      const { data: nextContent } = await supabase
        .from('course_content')
        .select('day')
        .eq('day', nextDay)
        .maybeSingle();

      if (nextContent) {
        await supabase
          .from('challenge_progress')
          .upsert({
            user_id: userId,
            day: nextDay,
            unlocked: true,
          }, { onConflict: 'user_id,day' });
      }
    }

    // Fire Loops events (non-blocking)
    const userEmail = user.email;
    if (userEmail) {
      // Check if unlocking next day triggers a phase-start event
      if (nextDay <= 30) {
        checkAndFirePhaseEvent(userEmail, nextDay, { userId }).catch(err =>
          logger.error('[LOOPS] phase event fire-and-forget error:', err)
        );
      }

      // If day 30 was just completed, fire challenge_complete
      if (Number(day) === 30) {
        sendLoopsEvent(userEmail, LOOPS_EVENTS.CHALLENGE_COMPLETE, { userId }).catch(err =>
          logger.error('[LOOPS] challenge_complete fire-and-forget error:', err)
        );
      }
    }

    return res.status(200).json({ success: true, nextDay: nextDay <= 30 ? nextDay : null });

  } catch (err) {
    logger.error('Task submit error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
