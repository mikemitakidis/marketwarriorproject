import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/import-trades
 * POST: Import trades from CSV data
 *
 * Supports formats:
 * - TradingView (export from trade history)
 * - MT4/MT5 (statement export)
 * - ThinkOrSwim (export from activity)
 * - Generic CSV (with column mapping)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { rows, format, columnMapping } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No trade data provided' });
    }

    const MAX_BATCH_SIZE = 500;
    if (rows.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        error: `Too many trades. Maximum ${MAX_BATCH_SIZE} per import. You sent ${rows.length}.`,
      });
    }

    // Parse trades based on format
    let parsedTrades;
    try {
      switch (format) {
        case 'tradingview':
          parsedTrades = parseTradingViewFormat(rows);
          break;
        case 'mt4':
        case 'mt5':
          parsedTrades = parseMT4MT5Format(rows);
          break;
        case 'thinkorswim':
          parsedTrades = parseThinkOrSwimFormat(rows);
          break;
        case 'generic':
        default:
          parsedTrades = parseGenericFormat(rows, columnMapping);
          break;
      }
    } catch (parseError) {
      logger.error('CSV parse error:', parseError);
      return res.status(400).json({
        error: 'Failed to parse CSV data',
        message: parseError.message,
      });
    }

    if (parsedTrades.length === 0) {
      return res.status(400).json({ error: 'No valid trades found in data' });
    }

    // Insert trades into database
    const supabase = getServiceSupabase();
    // Filter out trades with no entry_date (invalid date parsing)
    const validTrades = parsedTrades.filter(t => t.entry_date);
    if (validTrades.length === 0) {
      return res.status(400).json({ error: 'No valid trades found. Check date formats in your data.' });
    }

    const tradesToInsert = validTrades.map((trade) => ({
      journal_user_id: user.id,
      ...trade,
      status: trade.exit_date ? 'closed' : 'open',
    }));

    const { data, error } = await supabase
      .from('journal_trades')
      .insert(tradesToInsert)
      .select('id');

    if (error) {
      logger.error('Trade import error:', error);
      return res.status(500).json({ error: 'Failed to import trades' });
    }

    return res.status(200).json({
      success: true,
      imported: data.length,
      message: `Successfully imported ${data.length} trades`,
    });

  } catch (err) {
    logger.error('Import API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function parseTradingViewFormat(rows) {
  // TradingView CSV columns typically:
  // Symbol, Side, Entry Price, Exit Price, Profit, Date Opened, Date Closed, Quantity
  return rows.map((row) => {
    const symbol = row['Symbol'] || row['symbol'] || row[0];
    const side = row['Side'] || row['side'] || row['Type'] || row[1];
    const entryPrice = parseFloat(row['Entry Price'] || row['entry_price'] || row['Open'] || row[2]);
    const exitPrice = parseFloat(row['Exit Price'] || row['exit_price'] || row['Close'] || row[3]);
    const profit = parseFloat(row['Profit'] || row['profit'] || row['P&L'] || row[4]);
    const entryDate = row['Date Opened'] || row['date_opened'] || row['Entry Date'] || row[5];
    const exitDate = row['Date Closed'] || row['date_closed'] || row['Exit Date'] || row[6];
    const quantity = parseFloat(row['Quantity'] || row['quantity'] || row['Qty'] || row[7]) || 1;

    if (!symbol || isNaN(entryPrice)) {
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      direction: (side?.toLowerCase().includes('long') || side?.toLowerCase() === 'buy') ? 'long' : 'short',
      entry_price: entryPrice,
      exit_price: exitPrice || null,
      entry_date: parseDate(entryDate),
      exit_date: exitDate ? parseDate(exitDate) : null,
      quantity,
      pnl_amount: profit || (exitPrice ? (exitPrice - entryPrice) * quantity * (side?.toLowerCase().includes('short') ? -1 : 1) : null),
      asset_class: detectAssetClass(symbol),
    };
  }).filter(Boolean);
}

function parseMT4MT5Format(rows) {
  // MT4/MT5 statement format:
  // Ticket, Open Time, Type, Size, Symbol, Price, S/L, T/P, Close Time, Close Price, Profit
  return rows.map((row) => {
    const symbol = row['Symbol'] || row['Item'] || row[4];
    const type = row['Type'] || row[2];
    const openTime = row['Open Time'] || row['Open'] || row[1];
    const closeTime = row['Close Time'] || row['Close'] || row[8];
    const openPrice = parseFloat(row['Price'] || row['Open Price'] || row[5]);
    const closePrice = parseFloat(row['Close Price'] || row[9]);
    const size = parseFloat(row['Size'] || row['Volume'] || row['Lots'] || row[3]) || 1;
    const profit = parseFloat(row['Profit'] || row['P/L'] || row[10]);
    const stopLoss = parseFloat(row['S/L'] || row['SL'] || row[6]);
    const takeProfit = parseFloat(row['T/P'] || row['TP'] || row[7]);

    // Skip non-trade rows (deposits, withdrawals, etc.)
    if (!symbol || !type || type.toLowerCase().includes('balance')) {
      return null;
    }

    const direction = (type.toLowerCase() === 'buy' || type.toLowerCase().includes('long')) ? 'long' : 'short';

    return {
      symbol: symbol.toUpperCase(),
      direction,
      entry_price: openPrice,
      exit_price: closePrice || null,
      entry_date: parseDate(openTime),
      exit_date: closeTime ? parseDate(closeTime) : null,
      quantity: size,
      stop_loss: !isNaN(stopLoss) ? stopLoss : null,
      take_profit: !isNaN(takeProfit) ? takeProfit : null,
      pnl_amount: !isNaN(profit) ? profit : null,
      asset_class: detectAssetClass(symbol),
    };
  }).filter(Boolean);
}

function parseThinkOrSwimFormat(rows) {
  // ThinkOrSwim export format:
  // Exec Time, Spread, Side, Qty, Pos Effect, Symbol, Exp, Strike, Type, Price, Net Price
  return rows.map((row) => {
    const symbol = row['Symbol'] || row['Underlying'] || row[5];
    const side = row['Side'] || row[2];
    const execTime = row['Exec Time'] || row['Date/Time'] || row[0];
    const price = parseFloat(row['Price'] || row['Fill Price'] || row[9]);
    const qty = parseFloat(row['Qty'] || row['Quantity'] || row[3]) || 1;
    const posEffect = row['Pos Effect'] || row[4];

    if (!symbol || !side) {
      return null;
    }

    // Determine if this is opening or closing a position
    const isOpening = posEffect?.toLowerCase().includes('open') || posEffect?.toLowerCase() === 'to open';

    return {
      symbol: symbol.toUpperCase(),
      direction: (side.toLowerCase() === 'buy' || side.toLowerCase().includes('long')) ? 'long' : 'short',
      entry_price: isOpening ? price : null,
      exit_price: !isOpening ? price : null,
      entry_date: parseDate(execTime),
      exit_date: !isOpening ? parseDate(execTime) : null,
      quantity: Math.abs(qty),
      asset_class: detectAssetClass(symbol),
    };
  }).filter(Boolean);
}

function parseGenericFormat(rows, columnMapping) {
  if (!columnMapping) {
    // Try to auto-detect columns
    columnMapping = autoDetectColumns(rows[0]);
  }

  return rows.map((row) => {
    const getValue = (key) => {
      const colName = columnMapping[key];
      return colName ? row[colName] : null;
    };

    const symbol = getValue('symbol');
    const direction = getValue('direction');
    const entryPrice = parseFloat(getValue('entry_price'));
    const exitPrice = parseFloat(getValue('exit_price'));
    const entryDate = getValue('entry_date');
    const exitDate = getValue('exit_date');
    const quantity = parseFloat(getValue('quantity')) || 1;
    const pnl = parseFloat(getValue('pnl'));
    const stopLoss = parseFloat(getValue('stop_loss'));
    const takeProfit = parseFloat(getValue('take_profit'));

    if (!symbol || isNaN(entryPrice)) {
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      direction: parseDirection(direction),
      entry_price: entryPrice,
      exit_price: !isNaN(exitPrice) ? exitPrice : null,
      entry_date: parseDate(entryDate),
      exit_date: exitDate ? parseDate(exitDate) : null,
      quantity,
      pnl_amount: !isNaN(pnl) ? pnl : null,
      stop_loss: !isNaN(stopLoss) ? stopLoss : null,
      take_profit: !isNaN(takeProfit) ? takeProfit : null,
      asset_class: detectAssetClass(symbol),
    };
  }).filter(Boolean);
}

function autoDetectColumns(firstRow) {
  const mapping = {};
  const keys = Object.keys(firstRow);

  const patterns = {
    symbol: /^(symbol|ticker|instrument|pair|item)$/i,
    direction: /^(direction|side|type|action)$/i,
    entry_price: /^(entry.?price|open.?price|buy.?price|price)$/i,
    exit_price: /^(exit.?price|close.?price|sell.?price)$/i,
    entry_date: /^(entry.?date|open.?date|date.?opened|entry.?time|open.?time)$/i,
    exit_date: /^(exit.?date|close.?date|date.?closed|exit.?time|close.?time)$/i,
    quantity: /^(quantity|qty|size|volume|lots|shares)$/i,
    pnl: /^(pnl|profit|p.?l|gain.?loss|result)$/i,
    stop_loss: /^(stop.?loss|sl|stop)$/i,
    take_profit: /^(take.?profit|tp|target)$/i,
  };

  for (const key of keys) {
    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(key) && !mapping[field]) {
        mapping[field] = key;
        break;
      }
    }
  }

  return mapping;
}

function parseDirection(direction) {
  if (!direction) return 'long';
  const d = direction.toLowerCase();
  if (d.includes('short') || d === 'sell' || d === 's') return 'short';
  return 'long';
}

function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try parsing various date formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  const parts = dateStr.split(/[/\-\.]/);
  if (parts.length === 3) {
    // Assume MM/DD/YYYY for US format
    const [a, b, c] = parts.map(p => parseInt(p, 10));
    let result;
    if (a > 12) {
      // DD/MM/YYYY
      result = new Date(c, b - 1, a);
    } else {
      // MM/DD/YYYY
      result = new Date(c, a - 1, b);
    }
    if (!isNaN(result.getTime())) {
      return result.toISOString();
    }
  }

  return null;
}

function detectAssetClass(symbol) {
  if (!symbol) return 'other';
  const s = symbol.toUpperCase();

  // Forex pairs
  if (/^(EUR|USD|GBP|JPY|AUD|NZD|CAD|CHF)/.test(s) && s.length === 6) {
    return 'forex';
  }

  // Crypto
  if (/(BTC|ETH|XRP|SOL|DOGE|USDT|USDC)/.test(s)) {
    return 'crypto';
  }

  // Futures (common patterns)
  if (/^(ES|NQ|YM|CL|GC|SI|ZB|ZN)/.test(s) || s.includes('/')) {
    return 'futures';
  }

  // Default to stock
  return 'stock';
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};
