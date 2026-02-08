import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API route: /api/community/views
 *
 * POST: Record a view on a post (deduplicated per user)
 *   Body: { post_id: uuid }
 *   Returns: { views_count: number }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.general, identifier);
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
    const { post_id } = req.body;
    if (!post_id) {
      return res.status(400).json({ error: 'post_id is required' });
    }

    const supabase = getServiceSupabase();

    // Check if user already viewed this post
    const { data: existing } = await supabase
      .from('forum_post_views')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', post_id)
      .maybeSingle();

    if (!existing) {
      // Record new view
      await supabase
        .from('forum_post_views')
        .insert({ user_id: user.id, post_id });

      // Increment views_count on the post
      const { data: post } = await supabase
        .from('forum_posts')
        .select('views_count')
        .eq('id', post_id)
        .single();

      if (post) {
        const newCount = (post.views_count || 0) + 1;
        await supabase
          .from('forum_posts')
          .update({ views_count: newCount })
          .eq('id', post_id);

        return res.status(200).json({ views_count: newCount });
      }
    }

    // Already viewed — return current count
    const { data: post } = await supabase
      .from('forum_posts')
      .select('views_count')
      .eq('id', post_id)
      .single();

    return res.status(200).json({ views_count: post?.views_count || 0 });
  } catch (err) {
    logger.error('views error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
