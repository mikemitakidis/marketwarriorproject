import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/tags
 * GET: Fetch all tags (system + user's custom)
 * POST: Create a custom tag
 * DELETE: Delete a custom tag (via query param ?id=xxx)
 */
export default async function handler(req, res) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      const { category } = req.query;

      // Validate user.id is a valid UUID before using in filter
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      let query = supabase
        .from('journal_tags')
        .select('*')
        .or(`is_system.eq.true,journal_user_id.eq.${user.id}`)
        .order('category')
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data: tags, error } = await query;

      if (error) {
        logger.error('Error fetching tags:', error);
        return res.status(500).json({ error: 'Failed to fetch tags' });
      }

      // Group by category
      const grouped = {
        setup: [],
        mistake: [],
        emotion: [],
        market_condition: [],
        custom: [],
      };

      tags.forEach(tag => {
        if (grouped[tag.category]) {
          grouped[tag.category].push(tag);
        }
      });

      return res.status(200).json({ tags, grouped });
    }

    if (req.method === 'POST') {
      const { name, category = 'custom', color = '#667eea' } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tag name is required' });
      }

      const validCategories = ['setup', 'mistake', 'emotion', 'market_condition', 'custom'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Check if tag already exists for this user
      const { data: existing } = await supabase
        .from('journal_tags')
        .select('id')
        .eq('journal_user_id', user.id)
        .eq('name', name.trim())
        .eq('category', category)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'Tag already exists' });
      }

      const { data: tag, error } = await supabase
        .from('journal_tags')
        .insert({
          journal_user_id: user.id,
          name: name.trim(),
          category,
          color,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating tag:', error);
        return res.status(500).json({ error: 'Failed to create tag' });
      }

      return res.status(201).json(tag);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Tag ID required' });
      }

      // Verify ownership and not system tag
      const { data: tag } = await supabase
        .from('journal_tags')
        .select('*')
        .eq('id', id)
        .eq('journal_user_id', user.id)
        .eq('is_system', false)
        .maybeSingle();

      if (!tag) {
        return res.status(404).json({ error: 'Tag not found or cannot be deleted' });
      }

      const { error } = await supabase
        .from('journal_tags')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting tag:', error);
        return res.status(500).json({ error: 'Failed to delete tag' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Journal tags API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
