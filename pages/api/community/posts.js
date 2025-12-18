import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API endpoint for listing and creating forum posts.
 *
 * GET: Returns published posts filtered by optional category slug and day
 * number. Accepts query params `category` and `day`. Does not require auth.
 *
 * POST: Creates a new post. Requires authentication via cookie.
 * Body JSON must include `category_slug`, `title`, `content`, `author_name`
 * and optionally `day_number`.
 */
export default async function handler(req, res) {
  const supabase = getServiceSupabase();

  if (req.method === 'GET') {
    try {
      const { category, day } = req.query;
      let query = supabase
        .from('forum_posts')
        .select(
          'id, title, author_name, created_at, likes_count, comments_count, views_count, day_number, is_pinned, forum_categories:category_id (slug, name)'
        )
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('forum_categories.slug', category);
      }
      if (day) {
        query = query.eq('day_number', Number(day));
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error('community/posts GET error:', err);
      return res.status(500).json({ error: err.message });
    }

  } else if (req.method === 'POST') {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { category_slug, title, content, author_name, day_number } = req.body;
      if (!category_slug || !title || !content || !author_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Find category id by slug
      const { data: cat, error: catErr } = await supabase
        .from('forum_categories')
        .select('id, slug')
        .eq('slug', category_slug)
        .single();

      if (catErr || !cat) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const { data: post, error } = await supabase
        .from('forum_posts')
        .insert({
          user_id: user.id,
          category_id: cat.id,
          title,
          content,
          author_name,
          day_number: day_number || null,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(post);
    } catch (err) {
      console.error('community/posts POST error:', err);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
