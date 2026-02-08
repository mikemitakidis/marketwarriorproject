import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import { checkSpam, checkForumBan } from '../../../lib/forumSpamCheck';

/**
 * API route: /api/community/posts
 *
 * GET: List posts with optional filters (category, day, page, sort, search)
 *   Returns { posts, categories, totalCount, page, pageSize }
 *
 * POST: Create a new post
 *   Body: { title, content, category_slug, day_number?, author_name, name_type, image_url? }
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
    return res.status(403).json({ error: 'Payment required to access community' });
  }

  const supabase = getServiceSupabase();

  if (req.method === 'GET') {
    try {
      const { category, day, page = '1', sort = 'recent', search } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const pageSize = 20;
      const offset = (pageNum - 1) * pageSize;

      // Fetch categories
      const { data: categories } = await supabase
        .from('forum_categories')
        .select('id, slug, name, description')
        .order('id');

      // Build query for posts
      let query = supabase
        .from('forum_posts')
        .select('id, user_id, category_id, author_name, title, content, day_number, likes_count, comments_count, views_count, status, is_pinned, is_locked, image_url, created_at', { count: 'exact' })
        .eq('status', 'published');

      // Filter by category
      if (category) {
        const cat = (categories || []).find(c => c.slug === category);
        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      }

      // Filter by day number
      if (day) {
        const dayNum = parseInt(day);
        if (dayNum >= 1 && dayNum <= 30) {
          query = query.eq('day_number', dayNum);
        }
      }

      // Search by title or content
      if (search?.trim()) {
        query = query.or(`title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`);
      }

      // Sort: pinned first, then by sort type
      if (sort === 'popular') {
        query = query.order('is_pinned', { ascending: false }).order('likes_count', { ascending: false });
      } else {
        query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + pageSize - 1);

      const { data: posts, count, error } = await query;

      if (error) {
        logger.error('Error fetching posts:', error);
        return res.status(500).json({ error: 'Failed to fetch posts' });
      }

      // Get category counts for sidebar
      const { data: countData } = await supabase
        .from('forum_posts')
        .select('category_id')
        .eq('status', 'published');

      const categoryCounts = {};
      (countData || []).forEach(p => {
        categoryCounts[p.category_id] = (categoryCounts[p.category_id] || 0) + 1;
      });

      // Add category info to each post
      const categoryMap = {};
      (categories || []).forEach(c => { categoryMap[c.id] = c; });

      const postsWithCategory = (posts || []).map(p => ({
        ...p,
        category_slug: categoryMap[p.category_id]?.slug || 'general',
        category_name: categoryMap[p.category_id]?.name || 'General',
        preview: p.content?.substring(0, 200) + (p.content?.length > 200 ? '...' : ''),
      }));

      // Check which posts the current user has liked
      const postIds = (posts || []).map(p => p.id);
      let userLikes = {};
      if (postIds.length > 0) {
        const { data: likes } = await supabase
          .from('forum_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        (likes || []).forEach(l => { userLikes[l.post_id] = true; });
      }

      return res.status(200).json({
        posts: postsWithCategory.map(p => ({ ...p, user_has_liked: !!userLikes[p.id] })),
        categories: (categories || []).map(c => ({
          ...c,
          post_count: categoryCounts[c.id] || 0,
        })),
        totalCount: count || 0,
        page: pageNum,
        pageSize,
      });
    } catch (err) {
      logger.error('community/posts GET error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

  } else if (req.method === 'POST') {
    try {
      const { title, content, category_slug, day_number, author_name, name_type, image_url } = req.body;

      // Check if user is banned
      const banStatus = await checkForumBan(supabase, user.id);
      if (banStatus.banned) {
        return res.status(403).json({ error: banStatus.reason });
      }

      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      if (!category_slug) {
        return res.status(400).json({ error: 'Category is required' });
      }
      if (title.trim().length > 200) {
        return res.status(400).json({ error: 'Title must be under 200 characters' });
      }
      if (content.trim().length > 10000) {
        return res.status(400).json({ error: 'Content must be under 10,000 characters' });
      }

      // Spam check: link limits
      const spamResult = checkSpam(content + ' ' + title);
      if (!spamResult.ok) {
        return res.status(400).json({ error: spamResult.reason });
      }

      // Resolve category
      const { data: cat } = await supabase
        .from('forum_categories')
        .select('id, slug')
        .eq('slug', category_slug)
        .single();

      if (!cat) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Validate day_number if days-1-30 category
      let dayNum = null;
      if (cat.slug === 'days-1-30') {
        dayNum = parseInt(day_number);
        if (!dayNum || dayNum < 1 || dayNum > 30) {
          return res.status(400).json({ error: 'Day number (1-30) is required for this category' });
        }
      }

      // Determine author name
      let displayName;
      if (name_type === 'nickname' && author_name?.trim()) {
        displayName = author_name.trim().substring(0, 50);
      } else {
        displayName = gate.fullName || 'Anonymous';
      }

      const insertData = {
        user_id: user.id,
        category_id: cat.id,
        author_name: displayName,
        title: title.trim(),
        content: content.trim(),
        day_number: dayNum,
      };
      if (image_url) {
        insertData.image_url = image_url;
      }

      const { data: post, error } = await supabase
        .from('forum_posts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating post:', error);
        return res.status(500).json({ error: 'Failed to create post' });
      }

      return res.status(201).json(post);
    } catch (err) {
      logger.error('community/posts POST error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
