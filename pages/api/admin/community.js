import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/community
 *
 * GET: List forum threads for admin moderation
 * POST: Create a new thread (admin)
 * PUT: Update thread (pin/lock/hide)
 * DELETE: Delete a thread
 */
export default async function handler(req, res) {
  try {
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Fetch all threads with author info and reply count
      const { data: threads, error } = await supabase
        .from('forum_threads')
        .select(`
          id,
          title,
          body,
          is_pinned,
          is_locked,
          created_at,
          author:author_id (id, full_name, email)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching threads:', error);
        return res.status(500).json({ error: error.message });
      }

      // Get reply counts for each thread
      const threadIds = (threads || []).map(t => t.id);
      let replyCounts = {};

      if (threadIds.length > 0) {
        const { data: comments } = await supabase
          .from('forum_comments')
          .select('thread_id')
          .in('thread_id', threadIds)
          .is('deleted_at', null);

        (comments || []).forEach(c => {
          replyCounts[c.thread_id] = (replyCounts[c.thread_id] || 0) + 1;
        });
      }

      const threadsWithCounts = (threads || []).map(t => ({
        ...t,
        authorName: t.author?.full_name || t.author?.email?.split('@')[0] || 'Anonymous',
        reply_count: replyCounts[t.id] || 0,
      }));

      return res.status(200).json({ threads: threadsWithCounts });
    }

    if (req.method === 'POST') {
      // Create new thread
      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }

      const { data: thread, error } = await supabase
        .from('forum_threads')
        .insert({
          title,
          body,
          author_id: adminUser.id,
          is_pinned: false,
          is_locked: false,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ success: true, thread });
    }

    if (req.method === 'PUT') {
      // Update thread (pin, lock, hide)
      const { threadId, action } = req.body;

      if (!threadId || !action) {
        return res.status(400).json({ error: 'Thread ID and action are required' });
      }

      let updateData = {};
      switch (action) {
        case 'pin':
          updateData = { is_pinned: true };
          break;
        case 'unpin':
          updateData = { is_pinned: false };
          break;
        case 'lock':
          updateData = { is_locked: true };
          break;
        case 'unlock':
          updateData = { is_locked: false };
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      const { error } = await supabase
        .from('forum_threads')
        .update(updateData)
        .eq('id', threadId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { threadId } = req.body;

      if (!threadId) {
        return res.status(400).json({ error: 'Thread ID is required' });
      }

      // Delete thread and its comments
      await supabase.from('forum_comments').delete().eq('thread_id', threadId);
      const { error } = await supabase.from('forum_threads').delete().eq('id', threadId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Community API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
