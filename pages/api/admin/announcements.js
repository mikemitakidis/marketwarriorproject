import { getUserFromRequest, verifyAdminAccess, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API route: /api/admin/announcements
 *
 * GET: Fetch all announcements (including hidden)
 * POST: Create new announcement
 * PUT: Update announcement
 * DELETE: Delete announcement
 */
export default async function handler(req, res) {
  try {
    // SECURITY: Verify admin authorization
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Apply rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // GET: Fetch all announcements
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching announcements:', error);
        return res.status(500).json({ error: 'Failed to fetch announcements' });
      }

      return res.status(200).json({ announcements: data || [] });
    }

    // POST: Create new announcement
    if (req.method === 'POST') {
      const { message, link_url, link_text, type, background_color, text_color } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // SECURITY: Validate link_url has safe protocol (prevents javascript: XSS)
      let sanitizedLinkUrl = null;
      if (link_url && link_url.trim()) {
        const trimmedUrl = link_url.trim();
        try {
          const urlObj = new URL(trimmedUrl);
          if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return res.status(400).json({ error: 'Link URL must use http:// or https://' });
          }
          sanitizedLinkUrl = trimmedUrl;
        } catch (e) {
          // Allow relative URLs starting with /
          if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
            sanitizedLinkUrl = trimmedUrl;
          } else {
            return res.status(400).json({ error: 'Invalid link URL format' });
          }
        }
      }

      const announcementType = type === 'public' ? 'public' : 'student';

      const { data, error } = await supabase
        .from('announcements')
        .insert({
          message: message.trim(),
          link_url: sanitizedLinkUrl,
          link_text: link_text?.trim() || null,
          type: announcementType,
          background_color: background_color || '#3b82f6',
          text_color: text_color || '#ffffff',
          is_visible: true,
          link_clicks: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating announcement:', error);
        return res.status(500).json({ error: 'Failed to create announcement' });
      }

      return res.status(201).json({ announcement: data });
    }

    // PUT: Update announcement
    if (req.method === 'PUT') {
      const { id, message, link_url, link_text, type, is_visible, background_color, text_color } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
      }

      // SECURITY: Validate link_url has safe protocol (prevents javascript: XSS)
      let sanitizedLinkUrl = null;
      if (link_url !== undefined) {
        if (link_url && link_url.trim()) {
          const trimmedUrl = link_url.trim();
          try {
            const urlObj = new URL(trimmedUrl);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
              return res.status(400).json({ error: 'Link URL must use http:// or https://' });
            }
            sanitizedLinkUrl = trimmedUrl;
          } catch (e) {
            // Allow relative URLs starting with /
            if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
              sanitizedLinkUrl = trimmedUrl;
            } else {
              return res.status(400).json({ error: 'Invalid link URL format' });
            }
          }
        }
      }

      const updates = { updated_at: new Date().toISOString() };

      if (message !== undefined) updates.message = message.trim();
      if (link_url !== undefined) updates.link_url = sanitizedLinkUrl;
      if (link_text !== undefined) updates.link_text = link_text?.trim() || null;
      if (type !== undefined) updates.type = type === 'public' ? 'public' : 'student';
      if (is_visible !== undefined) updates.is_visible = Boolean(is_visible);
      if (background_color !== undefined) updates.background_color = background_color;
      if (text_color !== undefined) updates.text_color = text_color;

      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating announcement:', error);
        return res.status(500).json({ error: 'Failed to update announcement' });
      }

      return res.status(200).json({ announcement: data });
    }

    // DELETE: Delete announcement
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
      }

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting announcement:', error);
        return res.status(500).json({ error: 'Failed to delete announcement' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Admin announcements error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
