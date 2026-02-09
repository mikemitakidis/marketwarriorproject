import { getServiceSupabase, getUserFromRequest, getGateStatus, getUserChallengeStatus } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API route: /api/day/[day]
 *
 * Returns the lesson content, quiz questions, and task prompt for a given day.
 * Ensures user is authenticated, paid, and has access to the day.
 *
 * Uses the same time-based unlock logic as the day page (getUserChallengeStatus)
 * to ensure consistent access control across both the page and API.
 */
export default async function handler(req, res) {
  // Apply rate limiting for general API access
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.general, identifier);
  if (limited) return;

  const { query: { day } } = req;
  const dayNum = parseInt(day, 10);

  if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
    return res.status(400).json({ error: 'Invalid day' });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userId = user.id;
  const supabase = getServiceSupabase();

  // Check payment and onboarding status
  const gate = await getGateStatus(userId);
  if (!gate.hasPaid) {
    return res.status(403).json({ error: 'Payment required', redirect: '/pay' });
  }
  if (!gate.welcomeCompleted) {
    return res.status(403).json({ error: 'Please complete onboarding first', redirect: '/welcome' });
  }

  // UNIFIED UNLOCK CHECK: Use the same time-based logic as the day page
  // This ensures the page and API always agree on which days are accessible
  const challengeStatus = await getUserChallengeStatus(userId);
  if (!challengeStatus.unlockedDays.includes(dayNum)) {
    return res.status(403).json({ error: 'Day is locked. Days unlock every 24 hours from your registration.' });
  }

  // For day 1, auto-create progress if doesn't exist
  const { data: progress } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('day', dayNum)
    .maybeSingle();

  if (!progress && dayNum === 1) {
    const { data: day1Content } = await supabase
      .from('course_content')
      .select('day')
      .eq('day', 1)
      .maybeSingle();

    if (day1Content) {
      await supabase
        .from('challenge_progress')
        .upsert({ user_id: userId, day: 1, unlocked: true }, { onConflict: 'user_id,day' });
    }
  }

  // Fetch lesson content
  const { data: content, error: contentErr } = await supabase
    .from('course_content')
    .select('title, html_content, video_url, task_prompt')
    .eq('day', dayNum)
    .single();

  if (contentErr || !content) {
    return res.status(404).json({ error: 'Content not found for this day' });
  }

  // Fetch quiz questions (using correct column: question_text, NOT question)
  const { data: quizRows } = await supabase
    .from('quiz_questions')
    .select('id, question_text, options')
    .eq('day', dayNum)
    .order('order_index');

  // Transform quiz questions for frontend
  const quizQuestions = (quizRows || []).map(q => ({
    id: q.id,
    question: q.question_text,
    options: q.options,
  }));

  return res.status(200).json({
    title: content.title,
    lessonHtml: content.html_content,
    videoUrl: content.video_url,
    quizQuestions,
    taskPrompt: content.task_prompt,
  });
}
