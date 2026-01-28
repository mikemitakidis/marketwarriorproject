import { getServiceSupabase, getUserFromRequest } from '../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../lib/ratelimit';
import logger from '../../lib/logger';

/**
 * API route: /api/announcements
 *
 * GET: Fetch visible announcements for display
 *   - Query param: type=student|public|all (default: all)
 *   - Public users see 'public' announcements only
 *   - Students (authenticated) see both 'student' and 'public' announcements
 *   - Student announcements require authentication
 *
 * POST: Track link clicks
 *   - Body: { id: announcement_id }
 */
export default async function handler(req, res) {
  try {
    // Apply rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.general, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // GET: Fetch visible announcements
    if (req.method === 'GET') {
      const { type } = req.query;

      let query = supabase
        .from('announcements')
        .select('id, message, link_url, link_text, type, background_color, text_color, link_clicks, created_at')
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      // Filter by type if specified
      if (type === 'student') {
        // Student announcements require authentication
        const user = await getUserFromRequest(req);
        if (!user) {
          return res.status(401).json({ error: 'Authentication required for student announcements' });
        }
        // Students see both student and public announcements
        query = query.in('type', ['student', 'public']);
      } else if (type === 'public') {
        // Public pages only see public announcements (no auth required)
        query = query.eq('type', 'public');
      } else {
        // For 'all' or unspecified, check auth and return appropriate announcements
        const user = await getUserFromRequest(req);
        if (user) {
          // Authenticated users see all announcements
          // No additional filter needed
        } else {
          // Unauthenticated users only see public announcements
          query = query.eq('type', 'public');
        }
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching announcements:', error);
        return res.status(500).json({ error: 'Failed to fetch announcements' });
      }

      return res.status(200).json({ announcements: data || [] });
    }

    // POST: Track link click
    if (req.method === 'POST') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
      }

      // Increment click count
      const { error } = await supabase.rpc('increment_announcement_clicks', { announcement_id: id });

      // If RPC doesn't exist, fall back to manual increment
      if (error) {
        // Manual increment fallback
        const { data: current } = await supabase
          .from('announcements')
          .select('link_clicks')
          .eq('id', id)
          .single();

        if (current) {
          await supabase
            .from('announcements')
            .update({ link_clicks: (current.link_clicks || 0) + 1 })
            .eq('id', id);
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Announcements error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
