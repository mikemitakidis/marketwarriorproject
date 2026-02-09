import { getServiceSupabase } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * Keep-alive cron job to prevent Supabase free tier from pausing
 *
 * GET /api/cron/keep-alive
 *
 * Should be called every 6 days by a cron service (Vercel Cron, GitHub Actions, etc.)
 */
export default async function handler(req, res) {
  // Apply rate limiting for general API access
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.general, identifier);
  if (limited) return;

  // SECURITY: ALWAYS require CRON_SECRET (fail hard if missing)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET not configured - endpoint disabled');
    return res.status(500).json({ error: 'Cron endpoint not configured' });
  }

  // Use constant-time comparison to prevent timing attacks
  const expected = `Bearer ${cronSecret}`;
  const provided = authHeader || '';
  const isValid = expected.length === provided.length &&
    require('crypto').timingSafeEqual(Buffer.from(expected), Buffer.from(provided.padEnd(expected.length).slice(0, expected.length)));
  if (!isValid) {
    logger.warn('Unauthorized cron access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getServiceSupabase();

    // Simple query to keep database active
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error) {
      logger.error('Keep-alive query failed:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database is active',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    logger.error('Keep-alive error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
