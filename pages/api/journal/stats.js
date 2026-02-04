import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/stats
 * GET: Fetch dashboard statistics
 * Query params:
 *   - period: 'all', '7d', '30d', '90d', 'ytd' (default: 'all')
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();
    const { period = 'all' } = req.query;

    // Calculate date filter
    let startDate = null;
    const now = new Date();
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Build query
    let query = supabase
      .from('journal_trades')
      .select('*')
      .eq('journal_user_id', user.id)
      .eq('status', 'closed');

    if (startDate) {
      query = query.gte('exit_date', startDate.toISOString());
    }

    const { data: trades, error } = await query;

    if (error) {
      logger.error('Error fetching trades for stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    // Calculate statistics
    const stats = calculateStats(trades);

    // Get open trades count
    const { count: openTradesCount } = await supabase
      .from('journal_trades')
      .select('*', { count: 'exact', head: true })
      .eq('journal_user_id', user.id)
      .eq('status', 'open');

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayTrades } = await supabase
      .from('journal_trades')
      .select('*')
      .eq('journal_user_id', user.id)
      .gte('entry_date', today.toISOString());

    const todayStats = {
      trades: todayTrades?.length || 0,
      pnl: todayTrades?.reduce((sum, t) => sum + (t.pnl_amount || 0), 0) || 0,
    };

    // Get recent trades for chart
    const { data: recentTrades } = await supabase
      .from('journal_trades')
      .select('exit_date, pnl_amount, r_multiple')
      .eq('journal_user_id', user.id)
      .eq('status', 'closed')
      .order('exit_date', { ascending: true })
      .limit(100);

    // Calculate equity curve (cumulative P&L)
    let cumulative = 0;
    const equityCurve = (recentTrades || []).map(t => {
      cumulative += t.pnl_amount || 0;
      return {
        date: t.exit_date,
        pnl: t.pnl_amount,
        cumulative,
        r_multiple: t.r_multiple,
      };
    });

    // Get rule violations count
    const { count: violationsCount } = await supabase
      .from('journal_rule_violations')
      .select('*', { count: 'exact', head: true })
      .eq('journal_user_id', user.id)
      .eq('acknowledged', false);

    return res.status(200).json({
      period,
      stats,
      openTrades: openTradesCount || 0,
      todayStats,
      equityCurve,
      unacknowledgedViolations: violationsCount || 0,
    });

  } catch (err) {
    logger.error('Journal stats API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function calculateStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalRMultiple: 0,
      avgWin: 0,
      avgLoss: 0,
      avgRMultiple: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdown: 0,
      avgHoldingTimeMinutes: 0,
      consistencyScore: 0,
    };
  }

  const winningTrades = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnl_amount || 0) < 0);
  const breakEvenTrades = trades.filter(t => (t.pnl_amount || 0) === 0);

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const totalRMultiple = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0));

  const avgWin = winningTrades.length > 0
    ? grossProfit / winningTrades.length
    : 0;

  const avgLoss = losingTrades.length > 0
    ? grossLoss / losingTrades.length
    : 0;

  const winRate = trades.length > 0
    ? (winningTrades.length / trades.length) * 100
    : 0;

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const lossRate = 100 - winRate;
  const expectancy = ((winRate / 100) * avgWin) - ((lossRate / 100) * avgLoss);

  // Max drawdown calculation
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  // Sort by exit date for accurate drawdown
  const sortedTrades = [...trades].sort((a, b) =>
    new Date(a.exit_date) - new Date(b.exit_date)
  );

  sortedTrades.forEach(t => {
    cumulative += t.pnl_amount || 0;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // Largest win/loss
  const largestWin = winningTrades.length > 0
    ? Math.max(...winningTrades.map(t => t.pnl_amount || 0))
    : 0;

  const largestLoss = losingTrades.length > 0
    ? Math.min(...losingTrades.map(t => t.pnl_amount || 0))
    : 0;

  // Average holding time
  const tradesWithTime = trades.filter(t => t.holding_time_minutes != null);
  const avgHoldingTimeMinutes = tradesWithTime.length > 0
    ? tradesWithTime.reduce((sum, t) => sum + t.holding_time_minutes, 0) / tradesWithTime.length
    : 0;

  // Consistency Score (simplified)
  // Based on: profit distribution, no outsized winners
  let consistencyScore = 50; // Base score

  // Penalize if one trade is >30% of total profit
  if (totalPnl > 0 && largestWin > totalPnl * 0.3) {
    consistencyScore -= 20;
  }

  // Bonus for win rate > 50%
  if (winRate >= 50) {
    consistencyScore += 15;
  }

  // Bonus for positive profit factor
  if (profitFactor > 1.5) {
    consistencyScore += 15;
  } else if (profitFactor > 1) {
    consistencyScore += 10;
  }

  // Bonus for having enough trades (sample size)
  if (trades.length >= 20) {
    consistencyScore += 10;
  } else if (trades.length >= 10) {
    consistencyScore += 5;
  }

  // Cap at 100
  consistencyScore = Math.min(100, Math.max(0, consistencyScore));

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalRMultiple: Math.round(totalRMultiple * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    avgRMultiple: trades.length > 0 ? Math.round((totalRMultiple / trades.length) * 100) / 100 : 0,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    profitFactor: profitFactor === Infinity ? 999 : Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    avgHoldingTimeMinutes: Math.round(avgHoldingTimeMinutes),
    consistencyScore,
  };
}
