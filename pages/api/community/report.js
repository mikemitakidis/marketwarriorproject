import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

const AUTO_FLAG_THRESHOLD = 3;

/**
 * API route: /api/community/report
 *
 * POST: Report a post or comment
 *   Body: { target_type: 'post'|'comment', target_id: uuid, reason: string }
 *   Returns: { success: true }
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
    const { target_type, target_id, reason } = req.body;

    if (!target_type || !target_id || !reason?.trim()) {
      return res.status(400).json({ error: 'Target type, target ID, and reason are required' });
    }
    if (!['post', 'comment'].includes(target_type)) {
      return res.status(400).json({ error: 'Target type must be "post" or "comment"' });
    }
    if (reason.trim().length > 500) {
      return res.status(400).json({ error: 'Reason must be under 500 characters' });
    }

    const supabase = getServiceSupabase();

    // Verify target exists
    if (target_type === 'post') {
      const { data: post } = await supabase
        .from('forum_posts')
        .select('id, user_id')
        .eq('id', target_id)
        .single();

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      if (post.user_id === user.id) {
        return res.status(400).json({ error: 'You cannot report your own post' });
      }
    } else {
      const { data: comment } = await supabase
        .from('forum_comments')
        .select('id, user_id')
        .eq('id', target_id)
        .single();

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      if (comment.user_id === user.id) {
        return res.status(400).json({ error: 'You cannot report your own comment' });
      }
    }

    // Insert report (unique index prevents duplicates)
    const reportData = {
      reporter_id: user.id,
      target_type,
      reason: reason.trim(),
    };
    if (target_type === 'post') {
      reportData.post_id = target_id;
    } else {
      reportData.comment_id = target_id;
    }

    const { error: insertError } = await supabase
      .from('forum_reports')
      .insert(reportData);

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'You have already reported this' });
      }
      logger.error('Error creating report:', insertError);
      return res.status(500).json({ error: 'Failed to submit report' });
    }

    // Check if auto-flag threshold reached
    if (target_type === 'post') {
      const { count } = await supabase
        .from('forum_reports')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', target_id)
        .eq('status', 'pending');

      if (count >= AUTO_FLAG_THRESHOLD) {
        await supabase
          .from('forum_posts')
          .update({ status: 'flagged' })
          .eq('id', target_id)
          .eq('status', 'published');
      }
    } else {
      const { count } = await supabase
        .from('forum_reports')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', target_id)
        .eq('status', 'pending');

      if (count >= AUTO_FLAG_THRESHOLD) {
        await supabase
          .from('forum_comments')
          .update({ status: 'flagged' })
          .eq('id', target_id)
          .eq('status', 'published');
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('report error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
