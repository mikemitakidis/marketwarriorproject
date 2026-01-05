import { getServiceSupabase } from '../../lib/serverAuth';

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

  // Verify token
  const { token } = req.query;
  const expectedToken = process.env.KEEP_ALIVE_TOKEN;

  if (!expectedToken) {
    console.error('[keep-alive] KEEP_ALIVE_TOKEN not configured');
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (token !== expectedToken) {
    console.warn('[keep-alive] Invalid token attempt');
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
      console.error('[keep-alive] DB error:', error.message);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    const timestamp = new Date().toISOString();
    console.log(`[keep-alive] Success at ${timestamp}`);

    return res.status(200).json({
      success: true,
      message: 'Supabase connection alive',
      timestamp,
      rows_checked: data?.length || 0,
    });

  } catch (err) {
    console.error('[keep-alive] Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
