import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API endpoint for listing and creating forum threads.
 *
 * GET: Returns all threads with author info.
 * POST: Creates a new thread. Requires authentication and payment.
 */
export default async function handler(req, res) {
  // Apply rate limiting: general for GET, submission for POST
  const limiter = req.method === 'POST' ? rateLimiters.submission : rateLimiters.general;
  const limited = await applyRateLimit(limiter, req, res, getIdentifier);
  if (limited) return;
  const supabase = getServiceSupabase();

  if (req.method === 'GET') {
    try {
      const { data: threads, error } = await supabase
        .from('forum_threads')
        .select(`
          id,
          title,
          body,
          is_pinned,
          is_locked,
          created_at,
          author:author_id (full_name)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('Error fetching threads:', error);
        return res.status(500).json({ error: 'Failed to fetch threads' });
      }

      return res.status(200).json(threads || []);
    } catch (err) {
      logger.error('community/posts GET error:', err);
      return res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user has paid
      const gate = await getGateStatus(user.id);
      if (!gate.hasPaid) {
        return res.status(403).json({ error: 'Payment required to post' });
      }

      const { title, body } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      const { data: thread, error } = await supabase
        .from('forum_threads')
        .insert({
          author_id: user.id,
          title: title.trim(),
          body: body.trim(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating thread:', error);
        return res.status(500).json({ error: 'Failed to create thread' });
      }

      return res.status(201).json(thread);
    } catch (err) {
      logger.error('community/posts POST error:', err);
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
