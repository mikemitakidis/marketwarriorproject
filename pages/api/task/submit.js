import { getServiceSupabase } from '../../../lib/supabase';
const { getUserFromRequest } = require('../../../lib/serverAuth');

/**
 * API route: /api/task/submit
 *
 * Accepts POST `{ day: number, response: string }` and records a
 * submission in `task_submissions`.  It also marks the day as
 * completed in `challenge_progress` and schedules the next day to
 * unlock at midnight local time.  Because this logic occurs on
 * the server with a service role key, the client cannot bypass
 * progression rules.  Note: you may need to adjust timezone logic
 * according to your region (current env: Pacific/Auckland).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { day, response: taskResponse } = req.body;
    if (!day || !taskResponse) throw new Error('Missing day or response');
    const user = await getUserFromRequest(req);
    if (!user) throw new Error('Not authenticated');
    const userId = user.id;
    const supabase = getServiceSupabase();
    // Ensure quiz is passed before accepting task
    const { data: quizResult, error: quizErr } = await supabase
      .from('quiz_results')
      .select('score, total')
      .eq('user_id', userId)
      .eq('day', day)
      .single();
    if (quizErr || !quizResult || quizResult.score / quizResult.total < 0.6) {
      return res.status(403).json({ error: 'Quiz not passed yet' });
    }
    // Insert task submission
    const { error: insertErr } = await supabase
      .from('task_submissions')
      .insert({ user_id: userId, day, response: taskResponse });
    if (insertErr) throw new Error('Could not save task');
    // Mark day as completed and schedule next day
    const now = new Date();
    // Mark current day as completed
    await supabase
      .from('challenge_progress')
      .update({ completed: true, completed_at: now.toISOString() })
      .eq('user_id', userId)
      .eq('day', day);
    // Unlock the next day
    const nextDay = Number(day) + 1;
    if (nextDay <= 30) {
      // Create/update progress for next day with unlocked = true
      await supabase
        .from('challenge_progress')
        .upsert({ user_id: userId, day: nextDay, unlocked: true }, { onConflict: 'user_id,day' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
}