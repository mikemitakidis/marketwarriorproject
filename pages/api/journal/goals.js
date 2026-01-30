import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/goals
 * GET: Fetch all goals for user
 * POST: Create a new goal
 * PUT: Update a goal
 * DELETE: Delete a goal
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

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabase, user);
      case 'POST':
        return handlePost(req, res, supabase, user);
      case 'PUT':
        return handlePut(req, res, supabase, user);
      case 'DELETE':
        return handleDelete(req, res, supabase, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    logger.error('Goals API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function handleGet(req, res, supabase, user) {
  const { status } = req.query;

  let query = supabase
    .from('journal_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching goals:', error);
    return res.status(500).json({ error: 'Failed to fetch goals' });
  }

  // Calculate progress for each goal
  const goalsWithProgress = await Promise.all(
    data.map(async (goal) => {
      const progress = await calculateGoalProgress(supabase, user.id, goal);
      return { ...goal, ...progress };
    })
  );

  return res.status(200).json({ goals: goalsWithProgress });
}

async function handlePost(req, res, supabase, user) {
  const {
    name,
    description,
    goal_type,
    target_value,
    unit,
    start_date,
    deadline,
    milestones,
    notes,
  } = req.body;

  if (!name || !goal_type || target_value === undefined) {
    return res.status(400).json({ error: 'Name, goal_type, and target_value are required' });
  }

  const validTypes = [
    'total_pnl', 'monthly_pnl', 'win_rate', 'avg_r_multiple',
    'max_drawdown', 'trades_count', 'consistency_streak', 'profit_factor', 'custom'
  ];

  if (!validTypes.includes(goal_type)) {
    return res.status(400).json({ error: 'Invalid goal type' });
  }

  const { data, error } = await supabase
    .from('journal_goals')
    .insert({
      user_id: user.id,
      name,
      description,
      goal_type,
      target_value,
      unit: unit || getDefaultUnit(goal_type),
      start_date: start_date || new Date().toISOString().split('T')[0],
      deadline,
      milestones: milestones || [],
      notes,
      status: 'active',
      current_value: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating goal:', error);
    return res.status(500).json({ error: 'Failed to create goal' });
  }

  return res.status(201).json({ goal: data });
}

async function handlePut(req, res, supabase, user) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  // Remove fields that shouldn't be updated directly
  delete updates.user_id;
  delete updates.created_at;

  // Handle completion
  if (updates.status === 'completed' && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('journal_goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating goal:', error);
    return res.status(500).json({ error: 'Failed to update goal' });
  }

  return res.status(200).json({ goal: data });
}

async function handleDelete(req, res, supabase, user) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  const { error } = await supabase
    .from('journal_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Error deleting goal:', error);
    return res.status(500).json({ error: 'Failed to delete goal' });
  }

  return res.status(200).json({ success: true });
}

function getDefaultUnit(goalType) {
  switch (goalType) {
    case 'total_pnl':
    case 'monthly_pnl':
      return '$';
    case 'win_rate':
    case 'max_drawdown':
      return '%';
    case 'avg_r_multiple':
    case 'profit_factor':
      return 'R';
    case 'trades_count':
      return 'trades';
    case 'consistency_streak':
      return 'days';
    default:
      return '';
  }
}

async function calculateGoalProgress(supabase, userId, goal) {
  let currentValue = 0;
  let percentComplete = 0;

  try {
    switch (goal.goal_type) {
      case 'total_pnl': {
        const { data: trades } = await supabase
          .from('journal_trades')
          .select('pnl_amount')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .gte('exit_date', goal.start_date);

        currentValue = (trades || []).reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
        break;
      }

      case 'monthly_pnl': {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { data: trades } = await supabase
          .from('journal_trades')
          .select('pnl_amount')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .gte('exit_date', monthStart.toISOString());

        currentValue = (trades || []).reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
        break;
      }

      case 'win_rate': {
        const { data: trades } = await supabase
          .from('journal_trades')
          .select('pnl_amount')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .gte('exit_date', goal.start_date);

        if (trades && trades.length > 0) {
          const wins = trades.filter(t => (t.pnl_amount || 0) > 0).length;
          currentValue = Math.round((wins / trades.length) * 100);
        }
        break;
      }

      case 'avg_r_multiple': {
        const { data: trades } = await supabase
          .from('journal_trades')
          .select('r_multiple')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .gte('exit_date', goal.start_date);

        if (trades && trades.length > 0) {
          currentValue = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length;
          currentValue = Math.round(currentValue * 100) / 100;
        }
        break;
      }

      case 'profit_factor': {
        const { data: trades } = await supabase
          .from('journal_trades')
          .select('pnl_amount')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .gte('exit_date', goal.start_date);

        if (trades && trades.length > 0) {
          const grossProfit = trades
            .filter(t => (t.pnl_amount || 0) > 0)
            .reduce((sum, t) => sum + t.pnl_amount, 0);
          const grossLoss = Math.abs(
            trades
              .filter(t => (t.pnl_amount || 0) < 0)
              .reduce((sum, t) => sum + t.pnl_amount, 0)
          );
          currentValue = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0;
        }
        break;
      }

      case 'trades_count': {
        const { count } = await supabase
          .from('journal_trades')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'closed')
          .gte('exit_date', goal.start_date);

        currentValue = count || 0;
        break;
      }

      case 'max_drawdown': {
        // For max drawdown, currentValue is the current drawdown %
        // Lower is better, so we calculate differently
        const { data: trades } = await supabase
          .from('journal_trades')
          .select('pnl_amount, exit_date')
          .eq('user_id', userId)
          .eq('status', 'closed')
          .order('exit_date', { ascending: true });

        if (trades && trades.length > 0) {
          let peak = 0;
          let cumulative = 0;
          let maxDD = 0;

          trades.forEach(t => {
            cumulative += t.pnl_amount || 0;
            if (cumulative > peak) peak = cumulative;
            const dd = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
            if (dd > maxDD) maxDD = dd;
          });

          currentValue = Math.round(maxDD * 100) / 100;
        }
        break;
      }

      case 'consistency_streak': {
        // Count consecutive days with trades following rules
        const { data: reports } = await supabase
          .from('journal_daily_reports')
          .select('report_date, followed_plan, stayed_within_risk')
          .eq('user_id', userId)
          .order('report_date', { ascending: false })
          .limit(60);

        if (reports && reports.length > 0) {
          let streak = 0;
          for (const report of reports) {
            if (report.followed_plan && report.stayed_within_risk) {
              streak++;
            } else {
              break;
            }
          }
          currentValue = streak;
        }
        break;
      }

      default:
        currentValue = goal.current_value || 0;
    }

    // Calculate percent complete
    if (goal.goal_type === 'max_drawdown') {
      // For drawdown, we're trying to stay BELOW target
      percentComplete = currentValue <= goal.target_value ? 100 : Math.max(0, 100 - (currentValue - goal.target_value));
    } else {
      percentComplete = goal.target_value > 0
        ? Math.min(100, Math.round((currentValue / goal.target_value) * 100))
        : 0;
    }

    // Update milestones completion
    const updatedMilestones = (goal.milestones || []).map(m => ({
      ...m,
      completed: currentValue >= m.value,
      completed_at: currentValue >= m.value && !m.completed_at ? new Date().toISOString() : m.completed_at,
    }));

    return {
      current_value: currentValue,
      percent_complete: percentComplete,
      milestones: updatedMilestones,
      is_on_track: isGoalOnTrack(goal, currentValue, percentComplete),
    };

  } catch (err) {
    logger.error('Error calculating goal progress:', err);
    return {
      current_value: goal.current_value || 0,
      percent_complete: 0,
      milestones: goal.milestones || [],
      is_on_track: null,
    };
  }
}

function isGoalOnTrack(goal, currentValue, percentComplete) {
  if (!goal.deadline) return null;

  const now = new Date();
  const start = new Date(goal.start_date);
  const end = new Date(goal.deadline);

  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now - start) / (1000 * 60 * 60 * 24);

  if (elapsedDays <= 0) return true;
  if (elapsedDays >= totalDays) return percentComplete >= 100;

  const expectedProgress = (elapsedDays / totalDays) * 100;
  return percentComplete >= expectedProgress * 0.9; // 10% buffer
}
