import { getServiceSupabase } from '../../../lib/supabase';
import { getUserFromJwt } from '../../../lib/auth';

/**
 * API route: /api/progress/status
 *
 * Returns the challenge progress for the authenticated user.  The
 * response includes completedDays (array of numbers), unlockedDays
 * (array) and nextUnlockTime (ISO string or null).  This route must
 * be called from the client with a valid Supabase session cookie.  On
 * the server we look up the user by invoking Supabase auth API using
 * the provided JWT.  Implementation notes:
 *  - Only the service role key should query the `challenge_progress`
 *    table because of row level security.
 *  - The unlock logic assumes each day becomes available at
 *    midnight local time after the previous day is completed.  If
 *    Day N is completed at 2pm, Day N+1 will unlock at 00:00 the
 *    following day.  Adjust to match your business rules.
 */
export default async function handler(req, res) {
  try {
    // Verify JWT and obtain user
    const user = await getUserFromJwt(req);
    const userId = user.id;
    const supabase = getServiceSupabase();
    // Fetch all progress rows for user
    const { data: progressRows, error: progressErr } = await supabase
      .from('challenge_progress')
      .select('day, completed_at, available_at')
      .eq('user_id', userId);
    if (progressErr) throw new Error('Unable to fetch progress');
    // Determine completed days (quiz + task must be completed).  In this
    // simplified version we treat completed_at not null as completion.
    const completedDays = progressRows
      .filter((r) => r.completed_at)
      .map((r) => r.day);
    // Determine unlocked days based on available_at and current time.
    const nowIso = new Date().toISOString();
    const unlockedDays = progressRows
      .filter((r) => r.available_at && r.available_at <= nowIso)
      .map((r) => r.day);
    // Compute next unlock time: smallest day where available_at > now
    let nextUnlockTime = null;
    const futureRows = progressRows.filter((r) => r.available_at && r.available_at > nowIso);
    if (futureRows.length > 0) {
      futureRows.sort((a, b) => (a.available_at > b.available_at ? 1 : -1));
      nextUnlockTime = futureRows[0].available_at;
    }
    res.status(200).json({ completedDays, unlockedDays, nextUnlockTime });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message });
  }
}