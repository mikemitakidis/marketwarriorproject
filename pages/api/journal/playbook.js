import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/playbook
 * GET: Fetch all playbook entries for user
 * POST: Create new playbook entry
 * PUT: Update playbook entry
 * DELETE: Delete playbook entry
 */
export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // GET: Fetch all playbook entries
    if (req.method === 'GET') {
      const { data: playbooks, error } = await supabase
        .from('journal_playbook')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching playbooks:', error);
        return res.status(500).json({ error: 'Failed to fetch playbooks' });
      }

      // Calculate stats for each playbook
      const playbooksWithStats = await Promise.all(
        (playbooks || []).map(async (playbook) => {
          if (playbook.example_trade_ids && playbook.example_trade_ids.length > 0) {
            const { data: trades } = await supabase
              .from('journal_trades')
              .select('pnl_amount, r_multiple')
              .in('id', playbook.example_trade_ids)
              .eq('status', 'closed');

            if (trades && trades.length > 0) {
              const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
              return {
                ...playbook,
                total_trades: trades.length,
                win_rate: Math.round((wins.length / trades.length) * 100),
                avg_r_multiple: Math.round(
                  (trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length) * 100
                ) / 100,
              };
            }
          }
          return playbook;
        })
      );

      return res.status(200).json({ playbooks: playbooksWithStats });
    }

    // POST: Create new playbook entry
    if (req.method === 'POST') {
      const {
        name,
        description,
        entry_rules,
        exit_rules,
        stop_loss_rules,
        position_size_rules,
        do_list,
        dont_list,
        example_trade_ids,
        screenshot_urls,
      } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Playbook name is required' });
      }

      const { data: playbook, error } = await supabase
        .from('journal_playbook')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim() || null,
          entry_rules: entry_rules?.trim() || null,
          exit_rules: exit_rules?.trim() || null,
          stop_loss_rules: stop_loss_rules?.trim() || null,
          position_size_rules: position_size_rules?.trim() || null,
          do_list: do_list || [],
          dont_list: dont_list || [],
          example_trade_ids: example_trade_ids || [],
          screenshot_urls: screenshot_urls || [],
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating playbook:', error);
        return res.status(500).json({ error: 'Failed to create playbook' });
      }

      return res.status(201).json({ playbook });
    }

    // PUT: Update playbook entry
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Playbook ID is required' });
      }

      // Sanitize updates
      const sanitizedUpdates = {};
      const allowedFields = [
        'name', 'description', 'entry_rules', 'exit_rules',
        'stop_loss_rules', 'position_size_rules', 'do_list',
        'dont_list', 'example_trade_ids', 'screenshot_urls', 'is_active'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          sanitizedUpdates[field] = updates[field];
        }
      }

      const { data: playbook, error } = await supabase
        .from('journal_playbook')
        .update(sanitizedUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating playbook:', error);
        return res.status(500).json({ error: 'Failed to update playbook' });
      }

      if (!playbook) {
        return res.status(404).json({ error: 'Playbook not found' });
      }

      return res.status(200).json({ playbook });
    }

    // DELETE: Delete playbook entry
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Playbook ID is required' });
      }

      const { error } = await supabase
        .from('journal_playbook')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error deleting playbook:', error);
        return res.status(500).json({ error: 'Failed to delete playbook' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Playbook API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
