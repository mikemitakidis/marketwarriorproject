import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/ai-coach
 * POST: Get AI coaching feedback on trading performance
 *
 * Uses Google Gemini Flash (free tier) for AI responses
 * Includes rate limiting (10 requests/day per user)
 * Dev mode when GOOGLE_API_KEY is missing
 */

const DAILY_LIMIT = 10;

// System prompt - Strict Risk Manager persona
const SYSTEM_INSTRUCTION = `You are a Risk Manager at a Prop Firm. Your job is to analyze trading data for behavioral patterns including:
- Revenge trading (trading immediately after a loss)
- Oversizing (position size too large for account)
- Overtrading (too many trades in short time)
- Breaking personal trading rules
- Emotional decision making

Be strict, concise, and professional. Focus on risk management and discipline.
NEVER provide buy/sell signals, price predictions, or specific trading recommendations.
Always end with a brief disclaimer that this is educational only.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. AUTH CHECK
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // 2. CHECK ACCESS (Supporter or Course Student)
    const { data: supportPayments } = await supabase
      .from('support_payments')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('has_paid, ai_requests_today, ai_requests_date')
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

    // 3. DAILY RATE LIMIT CHECK
    const today = new Date().toISOString().split('T')[0];
    let requestsToday = profile?.ai_requests_today || 0;
    const lastRequestDate = profile?.ai_requests_date;

    // Reset counter if new day
    if (lastRequestDate !== today) {
      requestsToday = 0;
    }

    if (requestsToday >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You've used all ${DAILY_LIMIT} AI requests for today. Limit resets at midnight UTC.`,
        requestsUsed: requestsToday,
        dailyLimit: DAILY_LIMIT,
      });
    }

    // 4. CHECK FOR API KEY (Dev Mode)
    const apiKey = process.env.GOOGLE_API_KEY;
    const { message, mode = 'chat', image } = req.body;

    // Fetch trading context regardless of mode
    const tradingContext = await fetchTradingContext(supabase, user.id);

    if (!apiKey) {
      // DEV MODE - Return mock response
      logger.info('AI Coach running in DEV MODE - no API key');

      const mockResponse = generateMockResponse(message, mode, tradingContext);

      return res.status(200).json({
        response: mockResponse,
        stats: tradingContext.stats,
        tradesAnalyzed: tradingContext.tradesCount,
        devMode: true,
        requestsUsed: requestsToday,
        dailyLimit: DAILY_LIMIT,
      });
    }

    // 5. REAL AI CALL
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      // Build prompt based on mode
      let prompt;
      let parts = [];

      if (mode === 'weekly_review') {
        prompt = buildWeeklyReviewPrompt(tradingContext);
        parts.push({ text: prompt });
      } else {
        prompt = buildChatPrompt(message, tradingContext);
        parts.push({ text: prompt });
      }

      // Handle image if provided (Base64)
      if (image && image.data && image.mimeType) {
        parts.push({
          inlineData: {
            data: image.data,
            mimeType: image.mimeType,
          },
        });
        // Add instruction to analyze chart
        parts.push({
          text: '\n\nPlease also analyze the attached chart image and provide feedback on the trade setup, entry/exit points, or any patterns you notice.',
        });
      }

      const result = await model.generateContent(parts);
      const aiResponse = result.response.text();

      // 6. INCREMENT DAILY COUNTER
      await supabase
        .from('user_profiles')
        .update({
          ai_requests_today: requestsToday + 1,
          ai_requests_date: today,
        })
        .eq('id', user.id);

      return res.status(200).json({
        response: aiResponse,
        stats: tradingContext.stats,
        tradesAnalyzed: tradingContext.tradesCount,
        requestsUsed: requestsToday + 1,
        dailyLimit: DAILY_LIMIT,
      });

    } catch (aiError) {
      logger.error('Gemini API error:', aiError);
      return res.status(500).json({
        error: 'AI Service Unavailable',
        message: 'The AI service is temporarily unavailable. Please try again later.',
      });
    }

  } catch (err) {
    logger.error('AI Coach API error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}

async function fetchTradingContext(supabase, userId) {
  // Fetch recent trades
  const { data: trades } = await supabase
    .from('journal_trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('exit_date', { ascending: false })
    .limit(50);

  const { data: settings } = await supabase
    .from('journal_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: rules } = await supabase
    .from('journal_challenge_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: violations } = await supabase
    .from('journal_rule_violations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const stats = calculateTradingStats(trades || []);

  return {
    trades: trades || [],
    tradesCount: trades?.length || 0,
    stats,
    settings,
    rules: rules || [],
    violations: violations || [],
    accountSize: settings?.account_size || 10000,
    riskPercent: settings?.default_risk_percent || 1,
  };
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
      longWinRate: 0,
      shortWinRate: 0,
      tradingDays: 0,
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
  const days = new Set(trades.map(t => t.exit_date?.split('T')[0]).filter(Boolean));

  return {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0,
    avgRMultiple: trades.length > 0 ? Math.round((trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / trades.length) * 100) / 100 : 0,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgWin: wins.length > 0 ? Math.round((grossProfit / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : 0,
    longWinRate: longs.length > 0 ? Math.round((longs.filter(t => (t.pnl_amount || 0) > 0).length / longs.length) * 100) : 0,
    shortWinRate: shorts.length > 0 ? Math.round((shorts.filter(t => (t.pnl_amount || 0) > 0).length / shorts.length) * 100) : 0,
    tradingDays: days.size,
  };
}

function buildChatPrompt(message, context) {
  return `TRADING DATA FOR ANALYSIS:

Account Size: $${context.accountSize}
Default Risk: ${context.riskPercent}%

PERFORMANCE STATS (Last ${context.tradesCount} trades):
- Win Rate: ${context.stats.winRate}%
- Profit Factor: ${context.stats.profitFactor}
- Average R-Multiple: ${context.stats.avgRMultiple}
- Total P&L: $${context.stats.totalPnl}
- Long Win Rate: ${context.stats.longWinRate}%
- Short Win Rate: ${context.stats.shortWinRate}%
- Avg Win: $${context.stats.avgWin}
- Avg Loss: $${context.stats.avgLoss}
- Trading Days: ${context.stats.tradingDays}

TRADING RULES:
${context.rules.map(r => `- ${r.rule_type}: ${JSON.stringify(r.rule_value)}`).join('\n') || 'None configured'}

RECENT RULE VIOLATIONS: ${context.violations.length}

USER MESSAGE: ${message}

Analyze this data and respond to the user's question. Focus on behavioral patterns and risk management.`;
}

function buildWeeklyReviewPrompt(context) {
  return `Generate a WEEKLY TRADING REVIEW for this trader.

PERFORMANCE DATA (Last ${context.tradesCount} trades):
- Total Trades: ${context.stats.totalTrades}
- Win Rate: ${context.stats.winRate}%
- Profit Factor: ${context.stats.profitFactor}
- Average R-Multiple: ${context.stats.avgRMultiple}
- Total P&L: $${context.stats.totalPnl}
- Long Win Rate: ${context.stats.longWinRate}%
- Short Win Rate: ${context.stats.shortWinRate}%
- Average Win: $${context.stats.avgWin}
- Average Loss: $${context.stats.avgLoss}

RULE VIOLATIONS: ${context.violations.length}

FORMAT YOUR RESPONSE AS:

**WEEKLY PERFORMANCE SUMMARY**
[2-3 sentences]

**BEHAVIORAL PATTERNS IDENTIFIED**
- [Pattern 1]
- [Pattern 2]
- [Pattern 3]

**GRADES**
- Risk Management: [A-F]
- Discipline: [A-F]
- Execution: [A-F]

**ACTION ITEMS FOR NEXT WEEK**
1. [Action 1]
2. [Action 2]
3. [Action 3]

**FINAL THOUGHTS**
[1 encouraging sentence]

---
*Educational purposes only. Not financial advice.*`;
}

function generateMockResponse(message, mode, context) {
  if (mode === 'weekly_review') {
    return `[DEV MODE - AI Key Not Configured]

**WEEKLY PERFORMANCE SUMMARY**
This is a simulated weekly review. Your actual trading data shows ${context.stats.totalTrades} trades with a ${context.stats.winRate}% win rate.

**BEHAVIORAL PATTERNS IDENTIFIED**
- Pattern analysis requires live AI connection
- Your profit factor is ${context.stats.profitFactor}
- Average R-Multiple: ${context.stats.avgRMultiple}

**GRADES**
- Risk Management: [Requires AI]
- Discipline: [Requires AI]
- Execution: [Requires AI]

**ACTION ITEMS**
1. Configure GOOGLE_API_KEY in environment variables
2. Restart the application
3. Test the AI Coach again

---
*DEV MODE: The UI is working correctly. Add GOOGLE_API_KEY to enable real AI responses.*`;
  }

  return `[DEV MODE - AI Key Not Configured]

I'm the AI Trading Coach running in development mode. I can see your trading data:
- ${context.stats.totalTrades} trades analyzed
- ${context.stats.winRate}% win rate
- $${context.stats.totalPnl} total P&L

Your question was: "${message || 'No message provided'}"

To get real AI coaching responses:
1. Add GOOGLE_API_KEY to your environment variables in Vercel
2. The key should be from Google AI Studio (makersuite.google.com)
3. Redeploy your application

---
*DEV MODE: The integration is working correctly. Just needs the API key.*`;
}

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
