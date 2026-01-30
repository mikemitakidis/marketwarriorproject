import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/analytics
 * GET: Fetch advanced analytics including MAE/MFE analysis
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // Fetch all closed trades
    const { data: trades, error } = await supabase
      .from('journal_trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('exit_date', { ascending: false });

    if (error) {
      logger.error('Error fetching trades for analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch trades' });
    }

    // Calculate comprehensive analytics
    const analytics = calculateAdvancedAnalytics(trades || []);

    return res.status(200).json(analytics);

  } catch (err) {
    logger.error('Analytics API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function calculateAdvancedAnalytics(trades) {
  if (!trades || trades.length === 0) {
    return {
      summary: {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        avgRMultiple: 0,
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
      },
      maeAnalysis: null,
      mfeAnalysis: null,
      timeAnalysis: null,
      sessionAnalysis: null,
      directionAnalysis: null,
      streaks: null,
      equityCurve: [],
      weeklyPerformance: [],
      monthlyPerformance: [],
    };
  }

  // Basic stats
  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losses = trades.filter(t => (t.pnl_amount || 0) < 0);
  const breakevens = trades.filter(t => (t.pnl_amount || 0) === 0);

  const grossProfit = wins.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl_amount || 0), 0));
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);

  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const avgRMultiple = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length;

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl_amount || 0)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl_amount || 0)) : 0;

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  // MAE/MFE Analysis
  const tradesWithMAE = trades.filter(t => t.max_adverse_excursion != null);
  const tradesWithMFE = trades.filter(t => t.max_favorable_excursion != null);

  const maeAnalysis = tradesWithMAE.length > 0 ? calculateMAEAnalysis(tradesWithMAE) : null;
  const mfeAnalysis = tradesWithMFE.length > 0 ? calculateMFEAnalysis(tradesWithMFE) : null;

  // Time analysis (holding time)
  const tradesWithTime = trades.filter(t => t.holding_time_minutes != null);
  const timeAnalysis = tradesWithTime.length > 0 ? calculateTimeAnalysis(tradesWithTime) : null;

  // Session analysis
  const sessionAnalysis = calculateSessionAnalysis(trades);

  // Direction analysis (long vs short)
  const directionAnalysis = calculateDirectionAnalysis(trades);

  // Win/Loss streaks
  const streaks = calculateStreaks(trades);

  // Equity curve
  const equityCurve = calculateEquityCurve(trades);

  // Weekly performance
  const weeklyPerformance = calculateWeeklyPerformance(trades);

  // Monthly performance
  const monthlyPerformance = calculateMonthlyPerformance(trades);

  return {
    summary: {
      totalTrades: trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      breakevenTrades: breakevens.length,
      winRate: Math.round(winRate * 100),
      profitFactor: Math.round(profitFactor * 100) / 100,
      avgRMultiple: Math.round(avgRMultiple * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
    },
    maeAnalysis,
    mfeAnalysis,
    timeAnalysis,
    sessionAnalysis,
    directionAnalysis,
    streaks,
    equityCurve,
    weeklyPerformance,
    monthlyPerformance,
  };
}

function calculateMAEAnalysis(trades) {
  // MAE = Maximum Adverse Excursion (worst drawdown during trade)
  // Helps determine optimal stop loss placement

  const avgMAE = trades.reduce((sum, t) => sum + (t.max_adverse_excursion || 0), 0) / trades.length;

  // Group by outcome
  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losses = trades.filter(t => (t.pnl_amount || 0) < 0);

  const avgMAEWins = wins.length > 0
    ? wins.reduce((sum, t) => sum + (t.max_adverse_excursion || 0), 0) / wins.length
    : 0;

  const avgMAELosses = losses.length > 0
    ? losses.reduce((sum, t) => sum + (t.max_adverse_excursion || 0), 0) / losses.length
    : 0;

  // Find trades that could have been winners with tighter stops
  const potentialSaves = losses.filter(t => {
    const mae = t.max_adverse_excursion || 0;
    const mfe = t.max_favorable_excursion || 0;
    // If MFE was positive and greater than MAE, stop was likely too wide
    return mfe > 0 && mfe > Math.abs(mae) * 0.5;
  });

  // Distribution buckets
  const distribution = [
    { range: '0-1%', count: 0 },
    { range: '1-2%', count: 0 },
    { range: '2-3%', count: 0 },
    { range: '3-5%', count: 0 },
    { range: '5%+', count: 0 },
  ];

  trades.forEach(t => {
    const maePct = Math.abs(t.max_adverse_excursion || 0);
    if (maePct < 1) distribution[0].count++;
    else if (maePct < 2) distribution[1].count++;
    else if (maePct < 3) distribution[2].count++;
    else if (maePct < 5) distribution[3].count++;
    else distribution[4].count++;
  });

  return {
    avgMAE: Math.round(avgMAE * 100) / 100,
    avgMAEWins: Math.round(avgMAEWins * 100) / 100,
    avgMAELosses: Math.round(avgMAELosses * 100) / 100,
    potentialSaves: potentialSaves.length,
    distribution,
    insight: avgMAEWins > avgMAELosses * 0.8
      ? 'Your winners experience similar drawdowns to losers. Consider tighter stops.'
      : 'Your stop losses appear well-calibrated.',
  };
}

function calculateMFEAnalysis(trades) {
  // MFE = Maximum Favorable Excursion (best unrealized profit during trade)
  // Helps determine optimal take profit placement

  const avgMFE = trades.reduce((sum, t) => sum + (t.max_favorable_excursion || 0), 0) / trades.length;

  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losses = trades.filter(t => (t.pnl_amount || 0) < 0);

  const avgMFEWins = wins.length > 0
    ? wins.reduce((sum, t) => sum + (t.max_favorable_excursion || 0), 0) / wins.length
    : 0;

  const avgMFELosses = losses.length > 0
    ? losses.reduce((sum, t) => sum + (t.max_favorable_excursion || 0), 0) / losses.length
    : 0;

  // Calculate capture ratio (how much of MFE was captured as profit)
  const captureRatios = wins.filter(t => t.max_favorable_excursion > 0).map(t => {
    return (t.pnl_amount || 0) / t.max_favorable_excursion;
  });

  const avgCaptureRatio = captureRatios.length > 0
    ? captureRatios.reduce((sum, r) => sum + r, 0) / captureRatios.length
    : 0;

  // Trades that left significant profit on table
  const leftOnTable = wins.filter(t => {
    const mfe = t.max_favorable_excursion || 0;
    const pnl = t.pnl_amount || 0;
    return mfe > pnl * 2; // MFE was more than 2x final profit
  });

  return {
    avgMFE: Math.round(avgMFE * 100) / 100,
    avgMFEWins: Math.round(avgMFEWins * 100) / 100,
    avgMFELosses: Math.round(avgMFELosses * 100) / 100,
    avgCaptureRatio: Math.round(avgCaptureRatio * 100),
    tradesLeftOnTable: leftOnTable.length,
    insight: avgCaptureRatio < 0.5
      ? 'You\'re capturing less than 50% of potential profits. Consider trailing stops.'
      : avgCaptureRatio > 0.8
        ? 'Excellent profit capture! You\'re managing exits well.'
        : 'Good profit capture. Small improvements possible with better exit timing.',
  };
}

function calculateTimeAnalysis(trades) {
  const avgHoldingTime = trades.reduce((sum, t) => sum + (t.holding_time_minutes || 0), 0) / trades.length;

  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losses = trades.filter(t => (t.pnl_amount || 0) < 0);

  const avgTimeWins = wins.length > 0
    ? wins.reduce((sum, t) => sum + (t.holding_time_minutes || 0), 0) / wins.length
    : 0;

  const avgTimeLosses = losses.length > 0
    ? losses.reduce((sum, t) => sum + (t.holding_time_minutes || 0), 0) / losses.length
    : 0;

  // Format time
  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  return {
    avgHoldingTime: formatTime(avgHoldingTime),
    avgTimeWins: formatTime(avgTimeWins),
    avgTimeLosses: formatTime(avgTimeLosses),
    avgHoldingTimeMinutes: Math.round(avgHoldingTime),
    insight: avgTimeWins > avgTimeLosses * 1.5
      ? 'You hold winners longer than losers - good sign of letting profits run!'
      : avgTimeLosses > avgTimeWins * 1.5
        ? 'You hold losers longer than winners. Consider cutting losses faster.'
        : 'Balanced holding times for wins and losses.',
  };
}

function calculateSessionAnalysis(trades) {
  const sessions = {};

  trades.forEach(t => {
    const session = t.session || 'Unknown';
    if (!sessions[session]) {
      sessions[session] = { trades: 0, wins: 0, pnl: 0, totalR: 0 };
    }
    sessions[session].trades++;
    sessions[session].pnl += t.pnl_amount || 0;
    sessions[session].totalR += t.r_multiple || 0;
    if ((t.pnl_amount || 0) > 0) sessions[session].wins++;
  });

  return Object.entries(sessions).map(([session, data]) => ({
    session,
    trades: data.trades,
    winRate: Math.round((data.wins / data.trades) * 100),
    pnl: Math.round(data.pnl * 100) / 100,
    avgR: Math.round((data.totalR / data.trades) * 100) / 100,
  })).sort((a, b) => b.pnl - a.pnl);
}

function calculateDirectionAnalysis(trades) {
  const longs = trades.filter(t => t.direction === 'long');
  const shorts = trades.filter(t => t.direction === 'short');

  const analyze = (subset, name) => {
    if (subset.length === 0) return null;
    const wins = subset.filter(t => (t.pnl_amount || 0) > 0);
    const pnl = subset.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
    const avgR = subset.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / subset.length;

    return {
      direction: name,
      trades: subset.length,
      winRate: Math.round((wins.length / subset.length) * 100),
      pnl: Math.round(pnl * 100) / 100,
      avgR: Math.round(avgR * 100) / 100,
    };
  };

  return {
    long: analyze(longs, 'Long'),
    short: analyze(shorts, 'Short'),
  };
}

function calculateStreaks(trades) {
  if (trades.length === 0) return { maxWinStreak: 0, maxLossStreak: 0, currentStreak: 0 };

  // Sort by date ascending
  const sorted = [...trades].sort((a, b) =>
    new Date(a.exit_date || a.entry_date) - new Date(b.exit_date || b.entry_date)
  );

  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  sorted.forEach(t => {
    if ((t.pnl_amount || 0) > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if ((t.pnl_amount || 0) < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  });

  const lastTrade = sorted[sorted.length - 1];
  const currentStreak = (lastTrade?.pnl_amount || 0) > 0 ? currentWinStreak : -currentLossStreak;

  return {
    maxWinStreak,
    maxLossStreak,
    currentStreak,
  };
}

function calculateEquityCurve(trades) {
  // Sort by date ascending
  const sorted = [...trades].sort((a, b) =>
    new Date(a.exit_date || a.entry_date) - new Date(b.exit_date || b.entry_date)
  );

  let cumulative = 0;
  return sorted.map(t => {
    cumulative += t.pnl_amount || 0;
    return {
      date: (t.exit_date || t.entry_date)?.split('T')[0],
      pnl: Math.round(cumulative * 100) / 100,
      trade: t.symbol,
    };
  });
}

function calculateWeeklyPerformance(trades) {
  const weeks = {};

  trades.forEach(t => {
    const date = new Date(t.exit_date || t.entry_date);
    // Get start of week (Monday)
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date.setDate(diff)).toISOString().split('T')[0];

    if (!weeks[weekStart]) {
      weeks[weekStart] = { trades: 0, wins: 0, pnl: 0 };
    }
    weeks[weekStart].trades++;
    weeks[weekStart].pnl += t.pnl_amount || 0;
    if ((t.pnl_amount || 0) > 0) weeks[weekStart].wins++;
  });

  return Object.entries(weeks)
    .map(([week, data]) => ({
      week,
      trades: data.trades,
      winRate: Math.round((data.wins / data.trades) * 100),
      pnl: Math.round(data.pnl * 100) / 100,
    }))
    .sort((a, b) => new Date(b.week) - new Date(a.week))
    .slice(0, 12); // Last 12 weeks
}

function calculateMonthlyPerformance(trades) {
  const months = {};

  trades.forEach(t => {
    const date = new Date(t.exit_date || t.entry_date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!months[month]) {
      months[month] = { trades: 0, wins: 0, pnl: 0 };
    }
    months[month].trades++;
    months[month].pnl += t.pnl_amount || 0;
    if ((t.pnl_amount || 0) > 0) months[month].wins++;
  });

  return Object.entries(months)
    .map(([month, data]) => ({
      month,
      trades: data.trades,
      winRate: Math.round((data.wins / data.trades) * 100),
      pnl: Math.round(data.pnl * 100) / 100,
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12); // Last 12 months
}
