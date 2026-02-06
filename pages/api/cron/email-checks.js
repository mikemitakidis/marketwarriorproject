import { getServiceSupabase } from '../../../lib/serverAuth';
import { sendLoopsEvent, LOOPS_EVENTS } from '../../../lib/loops';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * Daily cron job for email engagement checks.
 *
 * GET /api/cron/email-checks
 *
 * Runs two checks:
 *  1. 7-Day Inactivity – fires `user_inactive_7d` for users who haven't
 *     logged in for exactly 7 days.
 *  2. 15-Day Expiration Warning – fires `access_expiring` for users who
 *     are 105 days past signup (15 days before the 120-day limit).
 *
 * Requires Bearer CRON_SECRET in Authorization header.
 * Recommended schedule: once every 24 hours.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.general, identifier);
  if (limited) return;

  // Auth
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[CRON] CRON_SECRET not configured');
    return res.status(500).json({ error: 'Cron endpoint not configured' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[CRON] Unauthorized email-checks access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getServiceSupabase();
  const results = { inactivity: [], expiration: [] };

  // ---------- 1. 7-Day Inactivity Check ----------
  try {
    // Users who haven't logged in for 7 days (between 7 and 8 days ago)
    // This window prevents re-firing on subsequent cron runs
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const { data: inactiveUsers, error: inactiveErr } = await supabase
      .from('user_profiles')
      .select('id, email, last_login')
      .eq('has_paid', true)
      .not('email', 'is', null)
      .lte('last_login', sevenDaysAgo.toISOString())
      .gte('last_login', eightDaysAgo.toISOString());

    if (inactiveErr) {
      logger.error('[CRON] Inactivity query error:', inactiveErr.message);
    } else if (inactiveUsers && inactiveUsers.length > 0) {
      logger.log(`[CRON] Found ${inactiveUsers.length} users inactive for 7 days`);

      for (const user of inactiveUsers) {
        const result = await sendLoopsEvent(user.email, LOOPS_EVENTS.USER_INACTIVE_7D, {
          userId: user.id,
          lastLogin: user.last_login,
        });
        results.inactivity.push({ email: user.email, ...result });
      }
    } else {
      logger.log('[CRON] No users inactive for exactly 7 days');
    }
  } catch (err) {
    logger.error('[CRON] Inactivity check error:', err.message);
    results.inactivity.push({ error: err.message });
  }

  // ---------- 2. 15-Day Expiration Warning ----------
  try {
    const now = new Date();

    // Users who signed up 105 days ago (between 105 and 106 days) = 15 days before 120-day limit
    const d105 = new Date(now);
    d105.setDate(d105.getDate() - 105);
    const d106 = new Date(now);
    d106.setDate(d106.getDate() - 106);

    // Check users by paid_at date (when they started their 120-day window)
    const { data: expiringUsers, error: expireErr } = await supabase
      .from('user_profiles')
      .select('id, email, paid_at, access_expires_at')
      .eq('has_paid', true)
      .not('email', 'is', null)
      .lte('paid_at', d105.toISOString())
      .gte('paid_at', d106.toISOString());

    if (expireErr) {
      logger.error('[CRON] Expiration query error:', expireErr.message);
    } else if (expiringUsers && expiringUsers.length > 0) {
      // Filter out users with unlimited access or explicit future expiration
      const usersToNotify = [];
      for (const user of expiringUsers) {
        // Skip if they have an explicit expiration set far in the future
        if (user.access_expires_at) {
          const expiresAt = new Date(user.access_expires_at);
          const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
          // Only notify if expiring within ~20 days (gives buffer)
          if (daysUntilExpiry > 20) continue;
        }
        usersToNotify.push(user);
      }

      logger.log(`[CRON] Found ${usersToNotify.length} users with access expiring in ~15 days`);

      for (const user of usersToNotify) {
        const result = await sendLoopsEvent(user.email, LOOPS_EVENTS.ACCESS_EXPIRING, {
          userId: user.id,
          paidAt: user.paid_at,
        });
        results.expiration.push({ email: user.email, ...result });
      }
    } else {
      logger.log('[CRON] No users at 105-day expiration mark');
    }
  } catch (err) {
    logger.error('[CRON] Expiration check error:', err.message);
    results.expiration.push({ error: err.message });
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    inactivityNotifications: results.inactivity.length,
    expirationNotifications: results.expiration.length,
    details: results,
  });
}
