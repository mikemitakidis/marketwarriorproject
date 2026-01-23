import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';

/**
 * API endpoint for creating comments on forum threads.
 *
 * POST: Creates a new comment. Requires authentication and payment.
 * Body: { thread_id: uuid, body: string }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user has paid
    const gate = await getGateStatus(user.id);
    if (!gate.hasPaid) {
      return res.status(403).json({ error: 'Payment required to comment' });
    }

    const { thread_id, body } = req.body;
    if (!thread_id || !body) {
      return res.status(400).json({ error: 'Thread ID and body are required' });
    }

    const supabase = getServiceSupabase();

    // Check if thread exists and is not locked
    const { data: thread, error: threadError } = await supabase
      .from('forum_threads')
      .select('id, is_locked')
      .eq('id', thread_id)
      .single();

    if (threadError || !thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.is_locked) {
      return res.status(403).json({ error: 'Thread is locked' });
    }

    // Create the comment
    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        thread_id,
        author_id: user.id,
        body: body.trim(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    return res.status(201).json(comment);
  } catch (err) {
    logger.error('comments POST error:', err);
    return res.status(500).json({ error: err.message });
  }
}
