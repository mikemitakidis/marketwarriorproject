import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API route: /api/day/[day]
 *
 * Returns the lesson content, quiz questions, and task prompt for a given day.
 * Ensures user is authenticated, paid, and has access to the day.
 */
export default async function handler(req, res) {
  // Apply rate limiting for general API access
  const limited = await applyRateLimit(rateLimiters.general, req, res, getIdentifier);
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

  // Get progress for this day
  let { data: progress, error: progError } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('day', dayNum)
    .single();

  // For day 1, auto-create progress if doesn't exist
  if ((progError || !progress) && dayNum === 1) {
    // First check if day 1 content exists
    const { data: day1Content } = await supabase
      .from('course_content')
      .select('day')
      .eq('day', 1)
      .maybeSingle();

    if (day1Content) {
      await supabase
        .from('challenge_progress')
        .upsert({ user_id: userId, day: 1, unlocked: true }, { onConflict: 'user_id,day' });

      const { data: newProgress } = await supabase
        .from('challenge_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('day', dayNum)
        .single();
      progress = newProgress;
      progError = null;
    }
  }

  if (progError || !progress) {
    return res.status(403).json({ error: 'Day not available yet. Complete previous days first.' });
  }

  if (!progress.unlocked) {
    return res.status(403).json({ error: 'Day is locked. Complete previous days first.' });
  }

  // For days > 1, verify previous day requirements
  if (dayNum > 1) {
    const { data: prevProgress } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .single();

    if (!prevProgress || !prevProgress.completed) {
      return res.status(403).json({ error: 'Complete the previous day first' });
    }

    // Check quiz was passed (using quiz_attempts - correct table!)
    const { data: quizAttempt } = await supabase
      .from('quiz_attempts')
      .select('score, max_score, passed')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (quizAttempt) {
      const passed = quizAttempt.passed || (quizAttempt.max_score > 0 && quizAttempt.score / quizAttempt.max_score >= 0.6);
      if (!passed) {
        return res.status(403).json({ error: `Pass Day ${dayNum - 1} quiz (60%) to continue` });
      }
    }

    // Check task was submitted
    const { data: taskSubmission } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .limit(1)
      .single();

    if (!taskSubmission) {
      return res.status(403).json({ error: `Complete Day ${dayNum - 1} task to continue` });
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
