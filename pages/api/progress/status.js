import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';

/**
 * API route: /api/progress/status
 *
 * Returns the challenge progress for the authenticated user.
 * Uses cookie-based auth via getUserFromRequest.
 */
export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = user.id;
    const supabase = getServiceSupabase();

    // Fetch all progress rows for user
    const { data: progressRows, error: progressErr } = await supabase
      .from('challenge_progress')
      .select('day, completed_at, unlocked')
      .eq('user_id', userId);

    if (progressErr) throw new Error('Unable to fetch progress');

    // Determine completed days
    const completedDays = (progressRows || [])
      .filter((r) => r.completed_at)
      .map((r) => r.day);

    // Determine unlocked days using the unlocked boolean
    const unlockedDays = (progressRows || [])
      .filter((r) => r.unlocked === true)
      .map((r) => r.day);

    return res.status(200).json({ completedDays, unlockedDays, nextUnlockTime: null });
  } catch (err) {
    logger.error('progress/status error:', err);
    return res.status(500).json({ error: err.message });
  }
}
