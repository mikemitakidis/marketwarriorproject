import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/share-card
 * GET: Generate data for shareable performance cards
 *
 * Card types:
 * - daily: Today's performance
 * - weekly: This week's performance
 * - monthly: This month's performance
 * - streak: Current win streak
 * - milestone: Achievement milestones
 * - trade: Single trade result
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

    const { type = 'weekly', tradeId } = req.query;
    const supabase = getServiceSupabase();

    // Get display name from journal user (already fetched via getJournalUser)
    const displayName = user.fullName?.split(' ')[0] || 'Trader';

    let cardData;

    switch (type) {
      case 'daily':
        cardData = await generateDailyCard(supabase, user.id, displayName);
        break;
      case 'weekly':
        cardData = await generateWeeklyCard(supabase, user.id, displayName);
        break;
      case 'monthly':
        cardData = await generateMonthlyCard(supabase, user.id, displayName);
        break;
      case 'streak':
        cardData = await generateStreakCard(supabase, user.id, displayName);
        break;
      case 'trade':
        if (!tradeId) {
          return res.status(400).json({ error: 'Trade ID required for trade card' });
        }
        cardData = await generateTradeCard(supabase, user.id, tradeId, displayName);
        break;
      case 'milestone':
        cardData = await generateMilestoneCard(supabase, user.id, displayName);
        break;
      default:
        return res.status(400).json({ error: 'Invalid card type' });
    }

    return res.status(200).json(cardData);

  } catch (err) {
    logger.error('Share card API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function generateDailyCard(supabase, userId, displayName) {
  const today = new Date().toISOString().split('T')[0];

  const { data: trades } = await supabase
    .from('journal_trades')
    .select('pnl_amount, r_multiple, symbol')
    .eq('journal_user_id', userId)
    .gte('exit_date', today)
    .eq('status', 'closed');

  if (!trades || trades.length === 0) {
    return {
      type: 'daily',
      title: 'No trades today',
      hasData: false,
    };
  }

  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);

  return {
    type: 'daily',
    title: `${displayName}'s Daily Recap`,
    subtitle: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    hasData: true,
    stats: {
      trades: trades.length,
      winRate: Math.round((wins.length / trades.length) * 100),
      pnl: Math.round(totalPnl * 100) / 100,
      rMultiple: Math.round(totalR * 100) / 100,
      symbols: [...new Set(trades.map(t => t.symbol))].slice(0, 3),
    },
    isPositive: totalPnl >= 0,
    gradient: totalPnl >= 0 ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626'],
  };
}

async function generateWeeklyCard(supabase, userId, displayName) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: trades } = await supabase
    .from('journal_trades')
    .select('pnl_amount, r_multiple, symbol')
    .eq('journal_user_id', userId)
    .gte('exit_date', weekAgo.toISOString())
    .eq('status', 'closed');

  if (!trades || trades.length === 0) {
    return {
      type: 'weekly',
      title: 'No trades this week',
      hasData: false,
    };
  }

  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losses = trades.filter(t => (t.pnl_amount || 0) < 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);

  const grossProfit = wins.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl_amount || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  return {
    type: 'weekly',
    title: `${displayName}'s Week in Review`,
    subtitle: 'Last 7 Days',
    hasData: true,
    stats: {
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round((wins.length / trades.length) * 100),
      pnl: Math.round(totalPnl * 100) / 100,
      rMultiple: Math.round(totalR * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
    },
    isPositive: totalPnl >= 0,
    gradient: totalPnl >= 0 ? ['#667eea', '#764ba2'] : ['#f59e0b', '#d97706'],
  };
}

async function generateMonthlyCard(supabase, userId, displayName) {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const { data: trades } = await supabase
    .from('journal_trades')
    .select('pnl_amount, r_multiple')
    .eq('journal_user_id', userId)
    .gte('exit_date', monthAgo.toISOString())
    .eq('status', 'closed');

  if (!trades || trades.length === 0) {
    return {
      type: 'monthly',
      title: 'No trades this month',
      hasData: false,
    };
  }

  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const totalR = trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0);

  return {
    type: 'monthly',
    title: `${displayName}'s Monthly Performance`,
    subtitle: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    hasData: true,
    stats: {
      trades: trades.length,
      winRate: Math.round((wins.length / trades.length) * 100),
      pnl: Math.round(totalPnl * 100) / 100,
      rMultiple: Math.round(totalR * 100) / 100,
      avgR: Math.round((totalR / trades.length) * 100) / 100,
    },
    isPositive: totalPnl >= 0,
    gradient: totalPnl >= 0 ? ['#10b981', '#06b6d4'] : ['#ef4444', '#f97316'],
  };
}

async function generateStreakCard(supabase, userId, displayName) {
  const { data: trades } = await supabase
    .from('journal_trades')
    .select('pnl_amount, exit_date')
    .eq('journal_user_id', userId)
    .eq('status', 'closed')
    .order('exit_date', { ascending: false })
    .limit(50);

  if (!trades || trades.length === 0) {
    return {
      type: 'streak',
      title: 'Start Trading!',
      hasData: false,
    };
  }

  // Calculate current streak
  let currentStreak = 0;
  let streakType = 'win';

  for (const trade of trades) {
    const isWin = (trade.pnl_amount || 0) > 0;
    if (currentStreak === 0) {
      streakType = isWin ? 'win' : 'loss';
      currentStreak = 1;
    } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
      currentStreak++;
    } else {
      break;
    }
  }

  const isWinStreak = streakType === 'win';

  return {
    type: 'streak',
    title: isWinStreak ? `${currentStreak} Win Streak!` : `${currentStreak} Trade Losing Streak`,
    subtitle: `${displayName} is ${isWinStreak ? 'on fire!' : 'pushing through'}`,
    hasData: true,
    stats: {
      streak: currentStreak,
      isWinStreak,
    },
    isPositive: isWinStreak,
    gradient: isWinStreak ? ['#f59e0b', '#ef4444'] : ['#6b7280', '#4b5563'],
    emoji: isWinStreak ? (currentStreak >= 5 ? '🔥' : currentStreak >= 3 ? '⚡' : '✅') : '💪',
  };
}

async function generateTradeCard(supabase, userId, tradeId, displayName) {
  const { data: trade } = await supabase
    .from('journal_trades')
    .select('*')
    .eq('id', tradeId)
    .eq('journal_user_id', userId)
    .single();

  if (!trade) {
    return {
      type: 'trade',
      title: 'Trade not found',
      hasData: false,
    };
  }

  const isWin = (trade.pnl_amount || 0) > 0;

  return {
    type: 'trade',
    title: `${trade.symbol} ${trade.direction.toUpperCase()}`,
    subtitle: `${displayName}'s ${isWin ? 'Winner' : 'Trade'}`,
    hasData: true,
    stats: {
      symbol: trade.symbol,
      direction: trade.direction,
      pnl: Math.round((trade.pnl_amount || 0) * 100) / 100,
      rMultiple: Math.round((trade.r_multiple || 0) * 100) / 100,
      entryPrice: trade.entry_price,
      exitPrice: trade.exit_price,
    },
    isPositive: isWin,
    gradient: isWin ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626'],
  };
}

async function generateMilestoneCard(supabase, userId, displayName) {
  const { data: trades } = await supabase
    .from('journal_trades')
    .select('pnl_amount, created_at')
    .eq('journal_user_id', userId)
    .eq('status', 'closed')
    .order('created_at', { ascending: true });

  if (!trades || trades.length === 0) {
    return {
      type: 'milestone',
      title: 'Start Your Journey!',
      hasData: false,
    };
  }

  const totalTrades = trades.length;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);

  // Find milestone
  let milestone = null;
  let emoji = '🎯';

  if (totalTrades >= 1000) {
    milestone = '1,000 Trades';
    emoji = '🏆';
  } else if (totalTrades >= 500) {
    milestone = '500 Trades';
    emoji = '🥇';
  } else if (totalTrades >= 250) {
    milestone = '250 Trades';
    emoji = '🥈';
  } else if (totalTrades >= 100) {
    milestone = '100 Trades';
    emoji = '🥉';
  } else if (totalTrades >= 50) {
    milestone = '50 Trades';
    emoji = '🎖️';
  } else if (totalTrades >= 25) {
    milestone = '25 Trades';
    emoji = '⭐';
  } else if (totalTrades >= 10) {
    milestone = '10 Trades';
    emoji = '🌟';
  } else {
    milestone = 'First Trades';
    emoji = '🚀';
  }

  return {
    type: 'milestone',
    title: `${milestone} Milestone!`,
    subtitle: `${displayName} has logged ${totalTrades} trades`,
    hasData: true,
    stats: {
      totalTrades,
      winRate: Math.round((wins.length / totalTrades) * 100),
      totalPnl: Math.round(totalPnl * 100) / 100,
    },
    isPositive: true,
    gradient: ['#667eea', '#764ba2'],
    emoji,
  };
}
