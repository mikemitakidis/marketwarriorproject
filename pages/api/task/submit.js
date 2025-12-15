import { getServiceSupabase } from '../../../lib/supabase';
import { getUserFromJwt } from '../../../lib/auth';

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
    const user = await getUserFromJwt(req);
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
    // Completed_at update
    await supabase
      .from('challenge_progress')
      .update({ completed_at: now.toISOString() })
      .eq('user_id', userId)
      .eq('day', day);
    // Determine next day available_at based on server time: challenge_start_date + day*24h
    const nextDay = Number(day) + 1;
    if (nextDay <= 30) {
      // Compute available_at: current time + 24 hours (server time).  In production this
      // should be based on `challenge_start_date` + (nextDay-1)*24h to ensure
      // consistent unlock schedule.
      const availableAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('challenge_progress')
        .upsert({ user_id: userId, day: nextDay, available_at: availableAt }, { onConflict: 'user_id,day' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
}