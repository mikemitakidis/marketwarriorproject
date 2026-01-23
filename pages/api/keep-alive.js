import { getServiceSupabase } from '../../lib/serverAuth';
import logger from '../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../lib/ratelimit';

/**
 * API route: /api/keep-alive
 *
 * Simple endpoint to keep Supabase project active.
 * Protected by KEEP_ALIVE_TOKEN environment variable.
 *
 * Usage: Set up cron-job.org to call:
 * https://marketwarriorproject.vercel.app/api/keep-alive?token=YOUR_TOKEN
 * every 2-3 days
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting for general API access
  const limited = await applyRateLimit(rateLimiters.general, req, res, getIdentifier);
  if (limited) return;

  // Verify token
  const { token } = req.query;
  const expectedToken = process.env.KEEP_ALIVE_TOKEN;

  if (!expectedToken) {
    logger.error('[keep-alive] KEEP_ALIVE_TOKEN not configured');
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (token !== expectedToken) {
    logger.warn('[keep-alive] Invalid token attempt');
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const supabase = getServiceSupabase();

    // Simple query to keep the database active
    const { data, error } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1);

    if (error) {
      logger.error('[keep-alive] DB error:', error.message);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    const timestamp = new Date().toISOString();
    logger.log(`[keep-alive] Success at ${timestamp}`);

    return res.status(200).json({
      success: true,
      message: 'Supabase connection alive',
      timestamp,
      rows_checked: data?.length || 0,
    });

  } catch (err) {
    logger.error('[keep-alive] Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
