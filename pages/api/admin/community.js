import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API route: /api/admin/community
 *
 * GET: List forum posts for admin moderation (all statuses)
 *   Query: ?status=all|published|hidden|flagged|deleted&search=text&category=slug&page=1
 *   Returns: { posts, stats, categories, totalCount, page }
 *
 * PUT: Moderate a post or comment
 *   Body: { type:'post'|'comment', id, action, ...data }
 *   Actions: pin, unpin, lock, unlock, hide, unhide, flag, unflag, delete, edit
 *
 * DELETE: Hard delete a post and its comments/likes
 *   Body: { post_id }
 */
export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      return handleGet(req, res, supabase);
    } else if (req.method === 'PUT') {
      return handlePut(req, res, supabase);
    } else if (req.method === 'DELETE') {
      return handleDelete(req, res, supabase);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    logger.error('Admin community error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function handleGet(req, res, supabase) {
  const { status = 'all', search, category, page = '1' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSize = 30;
  const offset = (pageNum - 1) * pageSize;

  // Fetch categories
  const { data: categories } = await supabase
    .from('forum_categories')
    .select('id, slug, name')
    .order('id');

  // Build query — admin sees ALL statuses
  let query = supabase
    .from('forum_posts')
    .select('id, user_id, category_id, author_name, title, content, day_number, likes_count, comments_count, views_count, status, is_pinned, is_locked, created_at, updated_at', { count: 'exact' });

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Filter by category
  if (category) {
    const cat = (categories || []).find(c => c.slug === category);
    if (cat) {
      query = query.eq('category_id', cat.id);
    }
  }

  // Search by title or content
  if (search?.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%,author_name.ilike.%${search.trim()}%`);
  }

  query = query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: posts, count, error } = await query;

  if (error) {
    logger.error('Admin community GET error:', error);
    return res.status(500).json({ error: error.message });
  }

  // Map category names
  const categoryMap = {};
  (categories || []).forEach(c => { categoryMap[c.id] = c; });

  // Get user emails and ban status for all post authors
  const userIds = [...new Set((posts || []).map(p => p.user_id))];
  let userMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, is_forum_banned')
      .in('id', userIds);
    (profiles || []).forEach(p => { userMap[p.id] = p; });
  }

  // Get report counts per post
  const postIds = (posts || []).map(p => p.id);
  let reportCounts = {};
  if (postIds.length > 0) {
    const { data: reports } = await supabase
      .from('forum_reports')
      .select('post_id')
      .in('post_id', postIds)
      .eq('status', 'pending');
    (reports || []).forEach(r => {
      if (r.post_id) reportCounts[r.post_id] = (reportCounts[r.post_id] || 0) + 1;
    });
  }

  const postsWithCategory = (posts || []).map(p => ({
    ...p,
    category_slug: categoryMap[p.category_id]?.slug || 'unknown',
    category_name: categoryMap[p.category_id]?.name || 'Unknown',
    user_email: userMap[p.user_id]?.email || null,
    is_user_banned: userMap[p.user_id]?.is_forum_banned || false,
    report_count: reportCounts[p.id] || 0,
  }));

  // Get forum stats
  const { count: totalPosts } = await supabase
    .from('forum_posts')
    .select('id', { count: 'exact', head: true });

  const { count: publishedPosts } = await supabase
    .from('forum_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: hiddenPosts } = await supabase
    .from('forum_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'hidden');

  const { count: flaggedPosts } = await supabase
    .from('forum_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'flagged');

  const { count: deletedPosts } = await supabase
    .from('forum_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'deleted');

  const { count: totalComments } = await supabase
    .from('forum_comments')
    .select('id', { count: 'exact', head: true });

  const { count: pendingReports } = await supabase
    .from('forum_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return res.status(200).json({
    posts: postsWithCategory,
    categories: categories || [],
    totalCount: count || 0,
    page: pageNum,
    pageSize,
    stats: {
      totalPosts: totalPosts || 0,
      publishedPosts: publishedPosts || 0,
      hiddenPosts: hiddenPosts || 0,
      flaggedPosts: flaggedPosts || 0,
      deletedPosts: deletedPosts || 0,
      totalComments: totalComments || 0,
      pendingReports: pendingReports || 0,
    },
  });
}

async function handlePut(req, res, supabase) {
  const { type = 'post', id, action, title, content, user_id, ban_reason } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  // Handle ban/unban (operates on user, not post)
  if (action === 'ban' || action === 'unban') {
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required for ban/unban' });
    }
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_forum_banned: action === 'ban',
        forum_ban_reason: action === 'ban' ? (ban_reason || 'Banned by admin') : null,
      })
      .eq('id', user_id);

    if (error) {
      logger.error(`Admin ${action} error:`, error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true, action });
  }

  // Handle dismiss reports
  if (action === 'dismiss_reports') {
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }
    const column = type === 'comment' ? 'comment_id' : 'post_id';
    await supabase
      .from('forum_reports')
      .update({ status: 'dismissed' })
      .eq(column, id)
      .eq('status', 'pending');

    return res.status(200).json({ success: true, action });
  }

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  const table = type === 'comment' ? 'forum_comments' : 'forum_posts';

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
    case 'hide':
      updateData = { status: 'hidden' };
      break;
    case 'unhide':
    case 'publish':
      updateData = { status: 'published' };
      break;
    case 'flag':
      updateData = { status: 'flagged' };
      break;
    case 'unflag':
      updateData = { status: 'published' };
      break;
    case 'delete':
      updateData = { status: 'deleted' };
      break;
    case 'restore':
      updateData = { status: 'published' };
      break;
    case 'edit':
      if (type === 'post') {
        if (title) updateData.title = title.trim();
        if (content) updateData.content = content.trim();
        updateData.updated_at = new Date().toISOString();
      } else {
        if (content) updateData.content = content.trim();
      }
      break;
    default:
      return res.status(400).json({ error: `Invalid action: ${action}` });
  }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', id);

  if (error) {
    logger.error(`Admin community ${action} error:`, error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, action });
}

async function handleDelete(req, res, supabase) {
  const { post_id } = req.body;

  if (!post_id) {
    return res.status(400).json({ error: 'post_id is required' });
  }

  // Delete in order: reports, comment likes, post likes, comments, views, then the post
  // Get comment IDs first
  const { data: comments } = await supabase
    .from('forum_comments')
    .select('id')
    .eq('post_id', post_id);

  const commentIds = (comments || []).map(c => c.id);

  // Delete comment reports
  if (commentIds.length > 0) {
    await supabase.from('forum_reports').delete().in('comment_id', commentIds);
    await supabase.from('forum_comment_likes').delete().in('comment_id', commentIds);
  }

  // Delete post reports
  await supabase.from('forum_reports').delete().eq('post_id', post_id);
  await supabase.from('forum_post_likes').delete().eq('post_id', post_id);
  await supabase.from('forum_post_views').delete().eq('post_id', post_id);
  await supabase.from('forum_comments').delete().eq('post_id', post_id);

  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', post_id);

  if (error) {
    logger.error('Admin community DELETE error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
