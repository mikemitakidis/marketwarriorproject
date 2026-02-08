import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API route: /api/community/likes
 *
 * POST: Toggle like/unlike on a post or comment
 *   Body: { type: 'post'|'comment', target_id: uuid }
 *   Returns: { liked: boolean, likes_count: number }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.submission, identifier);
  if (limited) return;

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const gate = await getGateStatus(user.id);
  if (!gate.hasPaid) {
    return res.status(403).json({ error: 'Payment required' });
  }

  try {
    const { type, target_id } = req.body;

    if (!type || !target_id) {
      return res.status(400).json({ error: 'Type and target_id are required' });
    }
    if (!['post', 'comment'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "post" or "comment"' });
    }

    const supabase = getServiceSupabase();

    if (type === 'post') {
      const { data: post } = await supabase
        .from('forum_posts')
        .select('id, likes_count')
        .eq('id', target_id)
        .single();

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if already liked
      const { data: existing } = await supabase
        .from('forum_post_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', target_id)
        .maybeSingle();

      if (existing) {
        // Unlike
        await supabase
          .from('forum_post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', target_id);

        const newCount = Math.max(0, (post.likes_count || 0) - 1);
        await supabase
          .from('forum_posts')
          .update({ likes_count: newCount })
          .eq('id', target_id);

        return res.status(200).json({ liked: false, likes_count: newCount });
      } else {
        // Like
        await supabase
          .from('forum_post_likes')
          .insert({ user_id: user.id, post_id: target_id });

        const newCount = (post.likes_count || 0) + 1;
        await supabase
          .from('forum_posts')
          .update({ likes_count: newCount })
          .eq('id', target_id);

        return res.status(200).json({ liked: true, likes_count: newCount });
      }

    } else {
      // Comment like
      const { data: comment } = await supabase
        .from('forum_comments')
        .select('id, likes_count')
        .eq('id', target_id)
        .single();

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const { data: existing } = await supabase
        .from('forum_comment_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('comment_id', target_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('forum_comment_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('comment_id', target_id);

        const newCount = Math.max(0, (comment.likes_count || 0) - 1);
        await supabase
          .from('forum_comments')
          .update({ likes_count: newCount })
          .eq('id', target_id);

        return res.status(200).json({ liked: false, likes_count: newCount });
      } else {
        await supabase
          .from('forum_comment_likes')
          .insert({ user_id: user.id, comment_id: target_id });

        const newCount = (comment.likes_count || 0) + 1;
        await supabase
          .from('forum_comments')
          .update({ likes_count: newCount })
          .eq('id', target_id);

        return res.status(200).json({ liked: true, likes_count: newCount });
      }
    }
  } catch (err) {
    logger.error('likes error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
