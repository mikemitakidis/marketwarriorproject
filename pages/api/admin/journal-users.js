/**
 * Admin API: Journal Users Management
 *
 * GET: Fetch all journal users with stats
 * PUT: Update a journal user (suspend, grant paid, set AI limit)
 */

import { getUserFromRequest, verifyAdminAccess, getServiceSupabase } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  try {
    // Verify admin access
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const supabase = getServiceSupabase();

    // GET: Fetch all journal users with stats
    if (req.method === 'GET') {
      // Get users
      const { data: users, error: usersError } = await supabase
        .from('journal_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        logger.error('Error fetching journal users:', usersError);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }

      // Get trade counts per user
      const { data: tradeCounts } = await supabase
        .from('journal_trades')
        .select('journal_user_id')
        .not('journal_user_id', 'is', null);

      // Count trades per user
      const tradeCountMap = {};
      (tradeCounts || []).forEach(t => {
        tradeCountMap[t.journal_user_id] = (tradeCountMap[t.journal_user_id] || 0) + 1;
      });

      // Enrich users with trade count
      const enrichedUsers = (users || []).map(u => ({
        ...u,
        trade_count: tradeCountMap[u.id] || 0,
      }));

      // Calculate stats
      const stats = {
        totalUsers: users?.length || 0,
        paidUsers: users?.filter(u => u.has_paid).length || 0,
        suspendedUsers: users?.filter(u => u.is_suspended).length || 0,
        totalTrades: tradeCounts?.length || 0,
        activeToday: users?.filter(u => {
          const today = new Date().toISOString().split('T')[0];
          return u.ai_requests_date === today;
        }).length || 0,
      };

      return res.status(200).json({ users: enrichedUsers, stats });
    }

    // PUT: Update a journal user
    if (req.method === 'PUT') {
      const { userId, action, value } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const updates = {};

      switch (action) {
        case 'suspend':
          updates.is_suspended = value === true;
          break;
        case 'grant_paid':
          updates.has_paid = value === true;
          if (value === true) {
            updates.paid_at = new Date().toISOString();
          }
          break;
        case 'set_ai_limit':
          // value should be a number or null (null = use default)
          updates.ai_daily_limit = value === '' || value === null ? null : parseInt(value);
          break;
        case 'set_notes':
          updates.admin_notes = value || null;
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('journal_users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        logger.error('Error updating journal user:', updateError);
        return res.status(500).json({ error: 'Failed to update user' });
      }

      return res.status(200).json({ user: updatedUser });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    logger.error('Journal users admin API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
