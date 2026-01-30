import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/ai-coach
 * POST: Get AI coaching feedback on trading performance
 *
 * Uses Google Gemini Flash (free tier) for AI responses
 * Only available to supporters (users who donated)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // Check if user is a supporter (has donated)
    const { data: supportPayments } = await supabase
      .from('support_payments')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    // Also allow course students access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('has_paid')
      .eq('id', user.id)
      .single();

    const isSupporter = (supportPayments && supportPayments.length > 0) || profile?.has_paid;

    if (!isSupporter) {
      return res.status(403).json({
        error: 'AI Coach is available for supporters only',
        message: 'Support development to unlock the AI Trading Coach feature!',
        supportUrl: 'https://buy.stripe.com/8x23cp0kU9gm7m65aKdAk03',
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const { query, mode = 'chat' } = req.body;

    // Fetch user's trading data for context
    const { data: trades } = await supabase
      .from('journal_trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('exit_date', { ascending: false })
      .limit(50);

    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: rules } = await supabase
      .from('journal_challenge_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: violations } = await supabase
      .from('journal_rule_violations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate stats
    const stats = calculateTradingStats(trades || []);

    // Build context for AI
    const tradingContext = buildTradingContext(trades || [], stats, rules || [], violations || [], settings);

    let prompt;
    if (mode === 'weekly_review') {
      prompt = buildWeeklyReviewPrompt(tradingContext);
    } else {
      prompt = buildChatPrompt(query, tradingContext);
    }

    // Call Gemini API
    const aiResponse = await callGeminiAPI(prompt);

    return res.status(200).json({
      response: aiResponse,
      stats: stats,
      tradesAnalyzed: trades?.length || 0,
    });

  } catch (err) {
    logger.error('AI Coach API error:', err);
    return res.status(500).json({ error: 'AI service error. Please try again.' });
  }
}

function calculateTradingStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      avgRMultiple: 0,
      profitFactor: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      maxDrawdown: 0,
      longWinRate: 0,
      shortWinRate: 0,
      bestDay: null,
      worstDay: null,
    };
  }

  const wins = trades.filter(t => (t.pnl_amount || 0) > 0);
  const losses = trades.filter(t => (t.pnl_amount || 0) < 0);
  const longs = trades.filter(t => t.direction === 'long');
  const shorts = trades.filter(t => t.direction === 'short');

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const grossProfit = wins.reduce((sum, t) => sum + (t.pnl_amount || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl_amount || 0), 0));

  // Group by day
  const byDay = {};
  trades.forEach(t => {
    const day = t.exit_date?.split('T')[0];
    if (day) {
      byDay[day] = (byDay[day] || 0) + (t.pnl_amount || 0);
    }
  });

  const days = Object.entries(byDay);
  const bestDay = days.length > 0 ? days.reduce((a, b) => a[1] > b[1] ? a : b) : null;
  const worstDay = days.length > 0 ? days.reduce((a, b) => a[1] < b[1] ? a : b) : null;

  return {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0,
    avgRMultiple: trades.length > 0 ? trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length : 0,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgWin: wins.length > 0 ? Math.round((grossProfit / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : 0,
    longWinRate: longs.length > 0 ? Math.round((longs.filter(t => (t.pnl_amount || 0) > 0).length / longs.length) * 100) : 0,
    shortWinRate: shorts.length > 0 ? Math.round((shorts.filter(t => (t.pnl_amount || 0) > 0).length / shorts.length) * 100) : 0,
    bestDay: bestDay ? { date: bestDay[0], pnl: bestDay[1] } : null,
    worstDay: worstDay ? { date: worstDay[0], pnl: worstDay[1] } : null,
    tradingDays: days.length,
  };
}

function buildTradingContext(trades, stats, rules, violations, settings) {
  // Get tag patterns
  const tagCounts = {};
  trades.forEach(t => {
    if (t.tags) {
      t.tags.forEach(tag => {
        tagCounts[tag.name] = (tagCounts[tag.name] || { count: 0, wins: 0 });
        tagCounts[tag.name].count++;
        if ((t.pnl_amount || 0) > 0) tagCounts[tag.name].wins++;
      });
    }
  });

  // Time patterns
  const hourlyPerformance = {};
  trades.forEach(t => {
    if (t.entry_date) {
      const hour = new Date(t.entry_date).getHours();
      hourlyPerformance[hour] = hourlyPerformance[hour] || { count: 0, pnl: 0 };
      hourlyPerformance[hour].count++;
      hourlyPerformance[hour].pnl += t.pnl_amount || 0;
    }
  });

  // Session performance
  const sessionPerformance = {};
  trades.forEach(t => {
    if (t.session) {
      sessionPerformance[t.session] = sessionPerformance[t.session] || { count: 0, wins: 0, pnl: 0 };
      sessionPerformance[t.session].count++;
      sessionPerformance[t.session].pnl += t.pnl_amount || 0;
      if ((t.pnl_amount || 0) > 0) sessionPerformance[t.session].wins++;
    }
  });

  return {
    stats,
    rules: rules.map(r => ({ type: r.rule_type, value: r.rule_value })),
    recentViolations: violations.length,
    accountSize: settings?.account_size || 10000,
    riskPercent: settings?.default_risk_percent || 1,
    topTags: Object.entries(tagCounts)
      .map(([name, data]) => ({ name, ...data, winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    sessionPerformance: Object.entries(sessionPerformance)
      .map(([session, data]) => ({ session, ...data, winRate: data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0 })),
  };
}

function buildChatPrompt(query, context) {
  return `You are an AI Trading Coach for a retail trader. Your role is to provide behavioral coaching, identify patterns, and help improve trading discipline. You NEVER give buy/sell signals or predict market direction.

TRADING STATISTICS:
- Total Trades: ${context.stats.totalTrades}
- Win Rate: ${context.stats.winRate}%
- Profit Factor: ${context.stats.profitFactor}
- Average R-Multiple: ${context.stats.avgRMultiple?.toFixed(2)}
- Total P&L: $${context.stats.totalPnl}
- Long Win Rate: ${context.stats.longWinRate}%
- Short Win Rate: ${context.stats.shortWinRate}%
- Average Win: $${context.stats.avgWin}
- Average Loss: $${context.stats.avgLoss}
- Trading Days: ${context.stats.tradingDays}

ACCOUNT SETTINGS:
- Account Size: $${context.accountSize}
- Default Risk: ${context.riskPercent}%

TRADING RULES SET BY USER:
${context.rules.map(r => `- ${r.type}: ${JSON.stringify(r.value)}`).join('\n') || 'None set'}

RECENT RULE VIOLATIONS: ${context.recentViolations}

TOP SETUP TAGS (by frequency):
${context.topTags.map(t => `- ${t.name}: ${t.count} trades, ${t.winRate}% win rate`).join('\n') || 'None'}

SESSION PERFORMANCE:
${context.sessionPerformance.map(s => `- ${s.session}: ${s.count} trades, ${s.winRate}% win rate, $${s.pnl.toFixed(2)} P&L`).join('\n') || 'None'}

USER QUESTION: ${query}

Provide helpful, actionable coaching advice. Focus on:
1. Identifying behavioral patterns
2. Risk management suggestions
3. Discipline improvement
4. Process over outcome

Keep response concise (2-3 paragraphs max). Be encouraging but honest.

IMPORTANT: Never provide trading signals, price predictions, or specific buy/sell advice. Always include a disclaimer that this is educational only.`;
}

function buildWeeklyReviewPrompt(context) {
  return `You are an AI Trading Coach generating a weekly review for a trader.

TRADING STATISTICS (Last 50 trades):
- Total Trades: ${context.stats.totalTrades}
- Win Rate: ${context.stats.winRate}%
- Profit Factor: ${context.stats.profitFactor}
- Average R-Multiple: ${context.stats.avgRMultiple?.toFixed(2)}
- Total P&L: $${context.stats.totalPnl}
- Long Win Rate: ${context.stats.longWinRate}%
- Short Win Rate: ${context.stats.shortWinRate}%

SETUP PERFORMANCE:
${context.topTags.map(t => `- ${t.name}: ${t.count} trades, ${t.winRate}% win rate`).join('\n') || 'None'}

SESSION PERFORMANCE:
${context.sessionPerformance.map(s => `- ${s.session}: ${s.count} trades, ${s.winRate}% win rate`).join('\n') || 'None'}

RULE VIOLATIONS: ${context.recentViolations}

Generate a weekly review with:
1. **Summary** (2-3 sentences on overall performance)
2. **Patterns Identified** (3 bullet points)
3. **Grades** (Risk: A-F, Discipline: A-F, Execution: A-F)
4. **Action Items** (3 specific things to work on)
5. **Encouragement** (1 sentence)

Keep it concise and actionable. Include disclaimer that this is educational only.`;
}

async function callGeminiAPI(prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error('Invalid response from AI');
  } catch (err) {
    logger.error('Gemini API error:', err);
    throw err;
  }
}
