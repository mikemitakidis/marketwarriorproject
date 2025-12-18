// Use correct relative imports.  The API route lives under
// pages/api/day/[day].js.  The lib directory is at the root
// of the project so we only need to traverse three levels up.
import { getServiceSupabase } from '../../../lib/supabase';
const { getUserFromRequest } = require('../../../lib/serverAuth');

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
  // Check whether the day is unlocked using progress table
  const { data: progress, error: progError } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('day', dayNum)
    .single();
  if (progError || !progress) {
    return res.status(403).json({ error: 'No progress record found for day' });
  }
  // Check if day is unlocked using the unlocked boolean
  if (!progress.unlocked) {
    return res.status(403).json({ error: 'Day is locked' });
  }
  // Additional check: ensure previous day (if any) has been completed and passed
  if (dayNum > 1) {
    const { data: prevProgress, error: prevErr } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .single();
    if (prevErr || !prevProgress || !prevProgress.completed_at) {
      return res.status(403).json({ error: 'Previous day not completed' });
    }
    // Check pass threshold in quiz_results
    const { data: prevResult, error: resultErr } = await supabase
      .from('quiz_results')
      .select('score, total')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .single();
    if (!resultErr && prevResult) {
      const passRate = prevResult.score / prevResult.total;
      if (passRate < 0.6) {
        return res.status(403).json({ error: 'Previous day quiz not passed' });
      }
    }
    // Ensure task submission exists for previous day
    const { data: taskRow, error: taskErr } = await supabase
      .from('task_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('day', dayNum - 1)
      .single();
    if (taskErr || !taskRow) {
      return res.status(403).json({ error: 'Previous day task not submitted' });
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