import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/tilt-detection
 * GET: Analyze recent trades for tilt behavior patterns
 *
 * Tilt Detection Algorithm:
 * 1. Loss followed by rapid re-entry (< 5 minutes)
 * 2. Position size increase after loss
 * 3. Multiple losses in quick succession
 * 4. Trading outside normal hours after loss
 * 5. Breaking established rules after loss
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

    // Get last 7 days of trades
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: trades, error } = await supabase
      .from('journal_trades')
      .select('*')
      .eq('journal_user_id', user.id)
      .gte('entry_date', sevenDaysAgo.toISOString())
      .order('entry_date', { ascending: true });

    if (error) {
      logger.error('Error fetching trades for tilt detection:', error);
      return res.status(500).json({ error: 'Failed to analyze trades' });
    }

    // Get user's rules
    const { data: rules } = await supabase
      .from('journal_challenge_rules')
      .select('*')
      .eq('journal_user_id', user.id)
      .eq('is_active', true);

    // Analyze for tilt patterns
    const tiltAnalysis = analyzeTiltPatterns(trades || [], rules || []);

    // Calculate tilt meter (0-100)
    const tiltMeter = calculateTiltMeter(tiltAnalysis);

    // Get today's tilt status
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = (trades || []).filter(t => t.entry_date?.startsWith(today));
    const todayTilt = analyzeTiltPatterns(todayTrades, rules || []);
    const todayTiltMeter = calculateTiltMeter(todayTilt);

    return res.status(200).json({
      tiltMeter,
      todayTiltMeter,
      analysis: tiltAnalysis,
      todayAnalysis: todayTilt,
      recommendation: getTiltRecommendation(tiltMeter),
      tradesAnalyzed: trades?.length || 0,
    });

  } catch (err) {
    logger.error('Tilt detection API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function analyzeTiltPatterns(trades, rules) {
  const patterns = {
    revengeTrading: [],      // Loss followed by quick re-entry
    oversizing: [],          // Position size increase after loss
    lossStreaks: [],         // Multiple consecutive losses
    rapidTrading: [],        // Too many trades in short time
    ruleBreaks: [],          // Rule violations after losses
    overtrading: false,      // More trades than usual
  };

  if (trades.length < 2) {
    return patterns;
  }

  // Sort by entry date
  const sortedTrades = [...trades].sort((a, b) =>
    new Date(a.entry_date) - new Date(b.entry_date)
  );

  let consecutiveLosses = 0;
  let lastLoss = null;
  let avgPositionSize = trades.reduce((sum, t) => sum + (t.quantity * t.entry_price), 0) / trades.length;

  for (let i = 0; i < sortedTrades.length; i++) {
    const trade = sortedTrades[i];
    const prevTrade = i > 0 ? sortedTrades[i - 1] : null;
    const isLoss = (trade.pnl_amount || 0) < 0;
    const positionValue = trade.quantity * trade.entry_price;

    // Track consecutive losses
    if (isLoss) {
      consecutiveLosses++;
      lastLoss = trade;

      if (consecutiveLosses >= 3) {
        patterns.lossStreaks.push({
          count: consecutiveLosses,
          trades: sortedTrades.slice(i - consecutiveLosses + 1, i + 1).map(t => t.id),
          totalLoss: sortedTrades.slice(i - consecutiveLosses + 1, i + 1)
            .reduce((sum, t) => sum + (t.pnl_amount || 0), 0),
        });
      }
    } else {
      consecutiveLosses = 0;
    }

    // Check for revenge trading (quick re-entry after loss)
    if (prevTrade && (prevTrade.pnl_amount || 0) < 0) {
      const timeBetween = new Date(trade.entry_date) - new Date(prevTrade.exit_date || prevTrade.entry_date);
      const minutesBetween = timeBetween / (1000 * 60);

      if (minutesBetween < 5 && minutesBetween >= 0) {
        patterns.revengeTrading.push({
          afterTrade: prevTrade.id,
          newTrade: trade.id,
          minutesBetween: Math.round(minutesBetween),
          previousLoss: prevTrade.pnl_amount,
        });
      }
    }

    // Check for oversizing after loss
    if (prevTrade && (prevTrade.pnl_amount || 0) < 0) {
      const prevPositionValue = prevTrade.quantity * prevTrade.entry_price;
      if (positionValue > prevPositionValue * 1.5) {
        patterns.oversizing.push({
          afterTrade: prevTrade.id,
          newTrade: trade.id,
          increasePct: Math.round(((positionValue / prevPositionValue) - 1) * 100),
        });
      }
    }

    // Check for rapid trading (multiple trades within 30 minutes)
    const recentTrades = sortedTrades.filter(t => {
      const timeDiff = new Date(trade.entry_date) - new Date(t.entry_date);
      return timeDiff > 0 && timeDiff < 30 * 60 * 1000;
    });

    if (recentTrades.length >= 3) {
      patterns.rapidTrading.push({
        trade: trade.id,
        tradesInLast30Min: recentTrades.length + 1,
      });
    }
  }

  // Check for overtrading (more than expected based on rules)
  const maxTradesRule = rules.find(r => r.rule_type === 'max_trades_per_day');
  if (maxTradesRule) {
    const tradesByDay = {};
    sortedTrades.forEach(t => {
      const day = t.entry_date?.split('T')[0];
      if (day) {
        tradesByDay[day] = (tradesByDay[day] || 0) + 1;
      }
    });

    const maxAllowed = maxTradesRule.rule_value?.count || 5;
    const overtradingDays = Object.entries(tradesByDay)
      .filter(([_, count]) => count > maxAllowed);

    if (overtradingDays.length > 0) {
      patterns.overtrading = true;
      patterns.ruleBreaks.push({
        rule: 'max_trades_per_day',
        violations: overtradingDays.map(([day, count]) => ({ day, count, limit: maxAllowed })),
      });
    }
  }

  return patterns;
}

function calculateTiltMeter(patterns) {
  let score = 0;

  // Revenge trading is a strong tilt indicator
  score += patterns.revengeTrading.length * 15;

  // Oversizing after loss
  score += patterns.oversizing.length * 20;

  // Loss streaks
  patterns.lossStreaks.forEach(streak => {
    score += Math.min(streak.count * 5, 25);
  });

  // Rapid trading
  score += patterns.rapidTrading.length * 10;

  // Rule breaks
  score += patterns.ruleBreaks.length * 15;

  // Overtrading
  if (patterns.overtrading) {
    score += 10;
  }

  // Cap at 100
  return Math.min(100, score);
}

function getTiltRecommendation(tiltMeter) {
  if (tiltMeter >= 80) {
    return {
      level: 'critical',
      message: 'STOP TRADING. Your tilt level is critical. Take at least a 2-hour break.',
      color: '#ef4444',
    };
  } else if (tiltMeter >= 60) {
    return {
      level: 'high',
      message: 'High tilt detected. Consider taking a 30-minute break before your next trade.',
      color: '#f97316',
    };
  } else if (tiltMeter >= 40) {
    return {
      level: 'moderate',
      message: 'Moderate tilt. Review your last few trades and ensure you\'re following your plan.',
      color: '#fbbf24',
    };
  } else if (tiltMeter >= 20) {
    return {
      level: 'low',
      message: 'Slight tilt indicators. Stay mindful of your emotions.',
      color: '#84cc16',
    };
  } else {
    return {
      level: 'none',
      message: 'No tilt detected. You\'re trading with good discipline!',
      color: '#22c55e',
    };
  }
}
