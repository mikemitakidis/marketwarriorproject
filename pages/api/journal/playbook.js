import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
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
    const user = await getJournalUser(req, res);
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
        .eq('journal_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching playbooks:', error);
        return res.status(500).json({ error: 'Failed to fetch playbooks' });
      }

      // Calculate comprehensive stats for each playbook
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
              const losses = trades.filter(t => (t.pnl_amount || 0) < 0);

              const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
              const grossProfit = wins.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
              const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl_amount || 0), 0));

              const winRate = Math.round((wins.length / trades.length) * 100);
              const avgR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length;
              const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

              // Performance Score (0-100)
              // Based on: win rate (30%), profit factor (30%), avg R (30%), trade count (10%)
              let score = 0;
              score += Math.min(30, (winRate / 100) * 30); // Win rate contribution
              score += Math.min(30, (Math.min(profitFactor, 3) / 3) * 30); // Profit factor contribution
              score += Math.min(30, ((avgR + 1) / 2) * 30); // Avg R contribution (normalized)
              score += Math.min(10, (trades.length / 10) * 10); // Trade count contribution

              return {
                ...playbook,
                total_trades: trades.length,
                win_rate: winRate,
                avg_r_multiple: Math.round(avgR * 100) / 100,
                total_pnl: Math.round(totalPnl * 100) / 100,
                profit_factor: Math.round(profitFactor * 100) / 100,
                avg_pnl: Math.round((totalPnl / trades.length) * 100) / 100,
                performance_score: Math.round(score),
              };
            }
          }
          return {
            ...playbook,
            total_trades: 0,
            win_rate: 0,
            avg_r_multiple: 0,
            total_pnl: 0,
            profit_factor: 0,
            avg_pnl: 0,
            performance_score: 0,
          };
        })
      );

      // Sort by performance score (highest first)
      const sortedPlaybooks = playbooksWithStats.sort((a, b) =>
        (b.performance_score || 0) - (a.performance_score || 0)
      );

      // Add rank
      const rankedPlaybooks = sortedPlaybooks.map((p, i) => ({
        ...p,
        rank: i + 1,
      }));

      return res.status(200).json({ playbooks: rankedPlaybooks });
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
          journal_user_id: user.id,
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
        .eq('journal_user_id', user.id)
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
        .eq('journal_user_id', user.id);

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
