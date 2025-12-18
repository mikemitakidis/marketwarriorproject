// Use correct relative imports.  The API route lives under
// pages/api/day/[day].js.  The lib directory is at the root
// of the project so we only need to traverse three levels up.
import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';

/**
 * API route: /api/day/[day]
 *
 * Returns the lesson content, quiz questions (excluding correct
 * answers) and task prompt for a given day.  It ensures the user is
 * authenticated, has purchased access, and that the requested day is
 * unlocked based on their progress.  Client‑side code should call
 * this endpoint to load content rather than reading directly from
 * Supabase.
 */
export default async function handler(req, res) {
  const {
    query: { day },
  } = req;
  const dayNum = parseInt(day, 10);
  // Validate day number: accept days 1 through 30.  If you need
  // additional days simply adjust the upper bound here.  The
  // existence of content for a day is checked later when loading
  // from the database, so this prevents invalid routes (e.g. /day/0).
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
    return res.status(400).json({ error: 'Invalid day' });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const userId = user.id;
  const supabase = getServiceSupabase();

  // Check payment status first
  const gate = await getGateStatus(userId);
  if (!gate.hasPaid) {
    return res.status(403).json({ error: 'Payment required', redirect: '/pay' });
  }
  if (!gate.welcomeCompleted) {
    return res.status(403).json({ error: 'Please complete onboarding first', redirect: '/welcome' });
  }

  // Check whether the day is unlocked using progress table
  let { data: progress, error: progError } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('day', dayNum)
    .single();

  // For day 1, auto-create progress record if it doesn't exist
  if ((progError || !progress) && dayNum === 1) {
    const { error: insertError } = await supabase
      .from('challenge_progress')
      .upsert({ user_id: userId, day: 1, unlocked: true }, { onConflict: 'user_id,day' });

    if (!insertError) {
      // Re-fetch the progress record
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
  // Check if day is unlocked using the unlocked boolean
  if (!progress.unlocked) {
    return res.status(403).json({ error: 'Day is locked. Complete previous days first.' });
  }
  // Additional check: ensure previous day (if any) has been completed
  if (dayNum > 1) {
    const { data: prevProgress, error: prevErr } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .single();
    if (prevErr || !prevProgress || !prevProgress.completed) {
      return res.status(403).json({ error: 'Complete the previous day first' });
    }
  }
  // Fetch lesson content (service role only)
  const { data: contentRow, error: contentErr } = await supabase
    .from('course_content')
    .select('*')
    .eq('day', dayNum)
    .single();
  if (contentErr || !contentRow) {
    return res.status(404).json({ error: 'Content not found' });
  }
  // Fetch quiz questions (excluding correct answers)
  const { data: quizRows, error: quizErr } = await supabase
    .from('quiz_questions')
    .select('id, question, options')
    .eq('day', dayNum)
    .order('id');
  if (quizErr) {
    return res.status(500).json({ error: 'Could not load quiz' });
  }
  return res.status(200).json({
    lessonHtml: contentRow.html_content,
    videoUrl: contentRow.video_url,
    quizQuestions: quizRows || [],
    taskPrompt: contentRow.task_prompt,
  });
}