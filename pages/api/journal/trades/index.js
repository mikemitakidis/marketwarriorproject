import { getUserFromRequest, getServiceSupabase } from '../../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../../lib/ratelimit';
import logger from '../../../../lib/logger';

/**
 * API: /api/journal/trades
 * GET: Fetch user's trades with filtering and pagination
 * POST: Create a new trade
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

    if (req.method === 'GET') {
      const {
        status,
        symbol,
        direction,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
        order_by = 'entry_date',
        order_dir = 'desc',
      } = req.query;

      let query = supabase
        .from('journal_trades')
        .select('*, journal_trade_tags(tag_id, journal_tags(id, name, category, color))', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (symbol) {
        query = query.ilike('symbol', `%${symbol}%`);
      }
      if (direction) {
        query = query.eq('direction', direction);
      }
      if (start_date) {
        query = query.gte('entry_date', start_date);
      }
      if (end_date) {
        query = query.lte('entry_date', end_date);
      }

      // Apply ordering
      const validOrderFields = ['entry_date', 'exit_date', 'pnl_amount', 'r_multiple', 'symbol', 'created_at'];
      const orderField = validOrderFields.includes(order_by) ? order_by : 'entry_date';
      const ascending = order_dir === 'asc';
      query = query.order(orderField, { ascending });

      // Apply pagination
      const limitNum = Math.min(parseInt(limit) || 50, 200);
      const offsetNum = parseInt(offset) || 0;
      query = query.range(offsetNum, offsetNum + limitNum - 1);

      const { data: trades, error, count } = await query;

      if (error) {
        logger.error('Error fetching trades:', error);
        return res.status(500).json({ error: 'Failed to fetch trades' });
      }

      // Flatten tags structure
      const tradesWithTags = trades.map(trade => ({
        ...trade,
        tags: trade.journal_trade_tags?.map(tt => tt.journal_tags).filter(Boolean) || [],
        journal_trade_tags: undefined,
      }));

      return res.status(200).json({
        trades: tradesWithTags,
        total: count,
        limit: limitNum,
        offset: offsetNum,
      });
    }

    if (req.method === 'POST') {
      const {
        symbol,
        direction,
        asset_class = 'stock',
        entry_price,
        entry_date,
        quantity,
        exit_price,
        exit_date,
        stop_loss,
        take_profit,
        execution_score,
        confidence_rating,
        timeframe,
        session,
        strategy,
        notes,
        pre_trade_plan,
        commission = 0,
        swap_fees = 0,
        tag_ids = [],
      } = req.body;

      // Validate required fields
      if (!symbol || !direction || !entry_price || !entry_date || !quantity) {
        return res.status(400).json({
          error: 'Missing required fields: symbol, direction, entry_price, entry_date, quantity',
        });
      }

      // Validate direction
      if (!['long', 'short'].includes(direction)) {
        return res.status(400).json({ error: 'Direction must be "long" or "short"' });
      }

      // Validate numeric fields
      const entryPriceNum = parseFloat(entry_price);
      const quantityNum = parseFloat(quantity);
      if (isNaN(entryPriceNum) || entryPriceNum <= 0) {
        return res.status(400).json({ error: 'Invalid entry price' });
      }
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      // Calculate derived fields
      let status = 'open';
      let pnl_amount = null;
      let pnl_percent = null;
      let r_multiple = null;
      let holding_time_minutes = null;
      let initial_risk_amount = null;

      // Calculate initial risk if stop loss provided
      if (stop_loss) {
        const stopLossNum = parseFloat(stop_loss);
        const riskPerShare = Math.abs(entryPriceNum - stopLossNum);
        initial_risk_amount = riskPerShare * quantityNum;
      }

      // If exit provided, calculate P&L
      if (exit_price && exit_date) {
        const exitPriceNum = parseFloat(exit_price);
        status = 'closed';

        // Calculate P&L
        const priceChange = direction === 'long'
          ? exitPriceNum - entryPriceNum
          : entryPriceNum - exitPriceNum;

        pnl_amount = (priceChange * quantityNum) - parseFloat(commission || 0) - parseFloat(swap_fees || 0);
        pnl_percent = (priceChange / entryPriceNum) * 100;

        // Calculate R-multiple if we have initial risk
        if (initial_risk_amount && initial_risk_amount > 0) {
          r_multiple = pnl_amount / initial_risk_amount;
        }

        // Calculate holding time
        const entryTime = new Date(entry_date);
        const exitTime = new Date(exit_date);
        holding_time_minutes = Math.round((exitTime - entryTime) / (1000 * 60));
      }

      // Insert trade
      const { data: trade, error: insertError } = await supabase
        .from('journal_trades')
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          direction,
          asset_class,
          entry_price: entryPriceNum,
          entry_date,
          quantity: quantityNum,
          exit_price: exit_price ? parseFloat(exit_price) : null,
          exit_date: exit_date || null,
          stop_loss: stop_loss ? parseFloat(stop_loss) : null,
          take_profit: take_profit ? parseFloat(take_profit) : null,
          initial_risk_amount,
          pnl_amount,
          pnl_percent,
          r_multiple,
          holding_time_minutes,
          execution_score: execution_score ? parseInt(execution_score) : null,
          confidence_rating: confidence_rating ? parseInt(confidence_rating) : null,
          timeframe,
          session,
          strategy,
          notes,
          pre_trade_plan,
          status,
          commission: parseFloat(commission) || 0,
          swap_fees: parseFloat(swap_fees) || 0,
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Error creating trade:', insertError);
        return res.status(500).json({ error: 'Failed to create trade' });
      }

      // Add tags if provided
      if (tag_ids.length > 0) {
        const tagInserts = tag_ids.map(tagId => ({
          trade_id: trade.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('journal_trade_tags')
          .insert(tagInserts);

        if (tagError) {
          logger.error('Error adding trade tags:', tagError);
          // Don't fail the whole request, trade was created
        }
      }

      return res.status(201).json(trade);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Journal trades API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
