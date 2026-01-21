import { getServiceSupabase } from '../../../lib/serverAuth';

/**
 * Keep-alive cron job to prevent Supabase free tier from pausing
 *
 * GET /api/cron/keep-alive
 *
 * Should be called every 6 days by a cron service (Vercel Cron, GitHub Actions, etc.)
 */
export default async function handler(req, res) {
  // Verify this is a cron request (check authorization header)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
      console.error('Keep-alive query failed:', error);
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
    console.error('Keep-alive error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
