import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import { checkSpam, checkForumBan } from '../../../lib/forumSpamCheck';

/**
 * API route: /api/community/comments
 *
 * GET: Fetch comments for a post
 *   Query: ?post_id=uuid
 *
 * POST: Create a new comment
 *   Body: { post_id, content, author_name, name_type }
 *
 * PUT: Edit own comment
 *   Body: { comment_id, content }
 *
 * DELETE: Delete own comment
 *   Body: { comment_id }
 */
export default async function handler(req, res) {
  const limiter = req.method === 'POST' ? rateLimiters.submission : rateLimiters.general;
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, limiter, identifier);
  if (limited) return;

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const gate = await getGateStatus(user.id);
  if (!gate.hasPaid) {
    return res.status(403).json({ error: 'Payment required' });
  }

  const supabase = getServiceSupabase();

  if (req.method === 'GET') {
    try {
      const { post_id } = req.query;
      if (!post_id) {
        return res.status(400).json({ error: 'post_id is required' });
      }

      const { data: comments, error } = await supabase
        .from('forum_comments')
        .select('id, user_id, author_name, content, likes_count, status, created_at')
        .eq('post_id', post_id)
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching comments:', error);
        return res.status(500).json({ error: 'Failed to fetch comments' });
      }

      // Check which comments user has liked
      const commentIds = (comments || []).map(c => c.id);
      let userLikes = {};
      if (commentIds.length > 0) {
        const { data: likes } = await supabase
          .from('forum_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        (likes || []).forEach(l => { userLikes[l.comment_id] = true; });
      }

      return res.status(200).json({
        comments: (comments || []).map(c => ({
          ...c,
          user_has_liked: !!userLikes[c.id],
          is_own: c.user_id === user.id,
        })),
      });
    } catch (err) {
      logger.error('comments GET error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

  } else if (req.method === 'POST') {
    try {
      const { post_id, content, author_name, name_type } = req.body;

      // Check if user is banned
      const banStatus = await checkForumBan(supabase, user.id);
      if (banStatus.banned) {
        return res.status(403).json({ error: banStatus.reason });
      }

      if (!post_id || !content?.trim()) {
        return res.status(400).json({ error: 'Post ID and content are required' });
      }
      if (content.trim().length > 5000) {
        return res.status(400).json({ error: 'Comment must be under 5,000 characters' });
      }

      // Spam check: link limits
      const spamResult = checkSpam(content);
      if (!spamResult.ok) {
        return res.status(400).json({ error: spamResult.reason });
      }

      // Check post exists and is not locked
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .select('id, is_locked, status')
        .eq('id', post_id)
        .single();

      if (postError || !post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (post.is_locked) {
        return res.status(403).json({ error: 'This post is locked' });
      }
      if (post.status !== 'published') {
        return res.status(403).json({ error: 'Cannot comment on this post' });
      }

      // Determine author name
      let displayName;
      if (name_type === 'nickname' && author_name?.trim()) {
        displayName = author_name.trim().substring(0, 50);
      } else {
        displayName = gate.fullName || 'Anonymous';
      }

      const { data: comment, error } = await supabase
        .from('forum_comments')
        .insert({
          post_id,
          user_id: user.id,
          author_name: displayName,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating comment:', error);
        return res.status(500).json({ error: 'Failed to create comment' });
      }

      // Increment comments_count on the post
      const { data: currentPost } = await supabase
        .from('forum_posts')
        .select('comments_count')
        .eq('id', post_id)
        .single();

      if (currentPost) {
        await supabase
          .from('forum_posts')
          .update({ comments_count: (currentPost.comments_count || 0) + 1 })
          .eq('id', post_id);
      }

      return res.status(201).json({
        ...comment,
        user_has_liked: false,
        is_own: true,
      });
    } catch (err) {
      logger.error('comments POST error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { comment_id, content } = req.body;
      if (!comment_id || !content?.trim()) {
        return res.status(400).json({ error: 'comment_id and content are required' });
      }
      if (content.trim().length > 5000) {
        return res.status(400).json({ error: 'Comment must be under 5,000 characters' });
      }

      // Verify the comment belongs to this user
      const { data: comment, error: fetchErr } = await supabase
        .from('forum_comments')
        .select('id, user_id')
        .eq('id', comment_id)
        .single();

      if (fetchErr || !comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      if (comment.user_id !== user.id) {
        return res.status(403).json({ error: 'You can only edit your own comments' });
      }

      const spamResult = checkSpam(content);
      if (!spamResult.ok) {
        return res.status(400).json({ error: spamResult.reason });
      }

      const { error } = await supabase
        .from('forum_comments')
        .update({ content: content.trim() })
        .eq('id', comment_id);

      if (error) {
        logger.error('Error editing comment:', error);
        return res.status(500).json({ error: 'Failed to edit comment' });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error('comments PUT error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

  } else if (req.method === 'DELETE') {
    try {
      const { comment_id } = req.body;
      if (!comment_id) {
        return res.status(400).json({ error: 'comment_id is required' });
      }

      // Verify the comment belongs to this user
      const { data: comment, error: fetchErr } = await supabase
        .from('forum_comments')
        .select('id, post_id, user_id')
        .eq('id', comment_id)
        .single();

      if (fetchErr || !comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      if (comment.user_id !== user.id) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }

      // Delete related data then the comment
      await supabase.from('forum_reports').delete().eq('comment_id', comment_id);
      await supabase.from('forum_comment_likes').delete().eq('comment_id', comment_id);
      const { error } = await supabase.from('forum_comments').delete().eq('id', comment_id);

      if (error) {
        logger.error('Error deleting comment:', error);
        return res.status(500).json({ error: 'Failed to delete comment' });
      }

      // Update comments_count on the parent post
      const { count } = await supabase
        .from('forum_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', comment.post_id)
        .eq('status', 'published');

      await supabase
        .from('forum_posts')
        .update({ comments_count: count || 0 })
        .eq('id', comment.post_id);

      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error('comments DELETE error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
