import { getJournalUser, getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/import-trades
 * POST: Import trades from CSV data
 *
 * Supports:
 * - Broker presets: eToro, Robinhood, IBKR, Trading 212
 * - Platform presets: TradingView, MT4/MT5, ThinkOrSwim
 * - Generic CSV (with column mapping)
 *
 * All broker/platform presets resolve to header mappings and go through
 * the generic parser — no fragile per-format code paths.
 *
 * Returns row-level error reporting so the user knows which rows failed.
 */

// ────────────────────────────────────────────────────────────────
// Broker / platform preset mappings
// Each preset maps our internal field names to the CSV header(s)
// that broker is known to use. First match wins.
// ────────────────────────────────────────────────────────────────
const BROKER_PRESETS = {
  etoro: {
    label: 'eToro',
    mapping: {
      symbol:      ['Instrument Name', 'Details', 'Instrument'],
      direction:   ['Action', 'Type'],
      entry_price: ['Open Rate', 'Open Price'],
      exit_price:  ['Close Rate', 'Close Price'],
      entry_date:  ['Open Date', 'Date Open', 'Date'],
      exit_date:   ['Close Date', 'Date Close'],
      quantity:    ['Units', 'Amount'],
      pnl:         ['Profit', 'Realized Equity Change', 'P/L'],
      stop_loss:   ['Stop Loss Rate', 'SL'],
      take_profit: ['Take Profit Rate', 'TP'],
    },
    directionMap: { buy: 'long', sell: 'short' },
  },
  robinhood: {
    label: 'Robinhood',
    mapping: {
      symbol:      ['Instrument', 'Symbol', 'Ticker'],
      direction:   ['Trans Code', 'Side', 'Type'],
      entry_price: ['Price', 'Average Price'],
      entry_date:  ['Activity Date', 'Process Date', 'Date'],
      quantity:    ['Quantity', 'Qty', 'Shares'],
      pnl:         ['Amount', 'Realized P/L'],
    },
    directionMap: { buy: 'long', sell: 'short' },
  },
  ibkr: {
    label: 'Interactive Brokers',
    mapping: {
      symbol:      ['Symbol', 'Financial Instrument'],
      direction:   ['Buy/Sell', 'Side', 'Code'],
      entry_price: ['T. Price', 'TradePrice', 'Price', 'Trade Price'],
      entry_date:  ['Date/Time', 'DateTime', 'TradeDate', 'Date', 'Trade Date/Time'],
      quantity:    ['Quantity', 'Qty'],
      pnl:         ['Realized P/L', 'Realized PnL', 'MTM P/L'],
    },
    // IBKR sometimes encodes direction in quantity sign
    quantitySignIsDirection: true,
    directionMap: { buy: 'long', 'bot': 'long', sell: 'short', sld: 'short' },
  },
  trading212: {
    label: 'Trading 212',
    mapping: {
      symbol:      ['Ticker', 'Symbol', 'Name'],
      direction:   ['Action', 'Type'],
      entry_price: ['Price / share', 'Price', 'Price/share'],
      entry_date:  ['Time', 'Date', 'Trading time'],
      quantity:    ['No. of shares', 'Shares', 'Quantity'],
      pnl:         ['Result', 'Result (EUR)', 'Result (USD)', 'Result (GBP)'],
    },
    directionMap: {
      'market buy': 'long', 'limit buy': 'long', buy: 'long',
      'market sell': 'short', 'limit sell': 'short', sell: 'short',
    },
  },
  tradingview: {
    label: 'TradingView',
    mapping: {
      symbol:      ['Symbol', 'Ticker'],
      direction:   ['Side', 'Type', 'Direction'],
      entry_price: ['Entry Price', 'Open', 'Open Price', 'Price'],
      exit_price:  ['Exit Price', 'Close', 'Close Price'],
      entry_date:  ['Date Opened', 'Entry Date', 'Open Date', 'Date'],
      exit_date:   ['Date Closed', 'Exit Date', 'Close Date'],
      quantity:    ['Quantity', 'Qty', 'Contracts'],
      pnl:         ['Profit', 'P&L', 'PnL', 'Net P/L'],
    },
    directionMap: { buy: 'long', long: 'long', sell: 'short', short: 'short' },
  },
  mt4: {
    label: 'MT4/MT5',
    mapping: {
      symbol:      ['Symbol', 'Item'],
      direction:   ['Type'],
      entry_price: ['Price', 'Open Price'],
      exit_price:  ['Close Price'],
      entry_date:  ['Open Time', 'Open'],
      exit_date:   ['Close Time', 'Close'],
      quantity:    ['Size', 'Volume', 'Lots'],
      pnl:         ['Profit', 'P/L'],
      stop_loss:   ['S/L', 'SL', 'Stop Loss'],
      take_profit: ['T/P', 'TP', 'Take Profit'],
    },
    directionMap: { buy: 'long', sell: 'short' },
    skipRow: (row) => {
      const type = (row['Type'] || '').toLowerCase();
      return type.includes('balance') || type.includes('credit') || type.includes('deposit') || type.includes('withdraw');
    },
  },
  thinkorswim: {
    label: 'ThinkOrSwim',
    mapping: {
      symbol:      ['Symbol', 'Underlying'],
      direction:   ['Side'],
      entry_price: ['Price', 'Fill Price', 'Net Price'],
      entry_date:  ['Exec Time', 'Date/Time', 'Date'],
      quantity:    ['Qty', 'Quantity'],
    },
    directionMap: { buy: 'long', sell: 'short' },
    // TOS uses Pos Effect to determine entry vs exit
    posEffectField: ['Pos Effect'],
  },
};

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

    // ── Resolve column mapping ────────────────────────────────────
    const preset = BROKER_PRESETS[format];
    let resolvedMapping;

    if (preset) {
      // Broker / platform preset: resolve header names from row keys
      const headers = Object.keys(rows[0] || {});
      resolvedMapping = resolvePresetMapping(preset.mapping, headers);
    } else if (format === 'generic' && columnMapping) {
      // Generic: use user-provided mapping
      resolvedMapping = columnMapping;
    } else {
      // Fallback: auto-detect
      resolvedMapping = autoDetectColumns(rows[0] || {});
    }

    // ── Parse trades with row-level error tracking ────────────────
    const parsed = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, data starts at 2

      try {
        // Skip row if preset says to
        if (preset?.skipRow && preset.skipRow(row)) {
          continue;
        }

        const trade = parseRow(row, resolvedMapping, preset);

        if (!trade) {
          errors.push({ row: rowNum, reason: 'Missing symbol or entry price' });
          continue;
        }

        if (!trade.entry_date) {
          errors.push({ row: rowNum, reason: `Could not parse date: "${getFirstMappedValue(row, resolvedMapping, 'entry_date')}"`, trade: { symbol: trade.symbol } });
          // Still import the trade with current timestamp as fallback
          trade.entry_date = new Date().toISOString();
        }

        parsed.push(trade);
      } catch (err) {
        errors.push({ row: rowNum, reason: err.message });
      }
    }

    if (parsed.length === 0) {
      return res.status(400).json({
        error: 'No valid trades found. Check that your file matches the selected format.',
        errors: errors.slice(0, 20),
      });
    }

    // ── Insert into database ──────────────────────────────────────
    const supabase = getServiceSupabase();
    const tradesToInsert = parsed.map((trade) => ({
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
      total: rows.length,
      skipped: rows.length - data.length,
      errors: errors.slice(0, 20), // Cap to avoid huge payloads
      message: `Successfully imported ${data.length} of ${rows.length} trades`,
    });

  } catch (err) {
    logger.error('Import API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ────────────────────────────────────────────────────────────────
// Resolve a preset mapping against actual CSV headers
// ────────────────────────────────────────────────────────────────
function resolvePresetMapping(presetMapping, headers) {
  const resolved = {};
  const headerLower = headers.map(h => h.toLowerCase().trim());

  for (const [field, candidates] of Object.entries(presetMapping)) {
    for (const candidate of candidates) {
      const idx = headerLower.indexOf(candidate.toLowerCase().trim());
      if (idx !== -1) {
        resolved[field] = headers[idx]; // Use original casing
        break;
      }
    }
  }

  // Fill gaps with auto-detection for any unresolved fields
  if (!resolved.symbol || !resolved.entry_price) {
    const auto = autoDetectColumns({ ...Object.fromEntries(headers.map(h => [h, ''])) });
    for (const [field, col] of Object.entries(auto)) {
      if (!resolved[field]) resolved[field] = col;
    }
  }

  return resolved;
}

// ────────────────────────────────────────────────────────────────
// Parse a single row into a trade object
// ────────────────────────────────────────────────────────────────
function parseRow(row, mapping, preset) {
  const get = (field) => {
    const col = mapping[field];
    return col ? (row[col] ?? null) : null;
  };

  const symbol = get('symbol');
  const entryPriceRaw = get('entry_price');
  const entryPrice = parseNumber(entryPriceRaw);

  if (!symbol || symbol.trim() === '' || isNaN(entryPrice)) {
    return null;
  }

  const exitPriceRaw = get('exit_price');
  const exitPrice = parseNumber(exitPriceRaw);
  const quantity = Math.abs(parseNumber(get('quantity'))) || 1;
  const pnl = parseNumber(get('pnl'));
  const stopLoss = parseNumber(get('stop_loss'));
  const takeProfit = parseNumber(get('take_profit'));

  // Direction resolution
  let direction = 'long';
  const dirRaw = get('direction');
  if (dirRaw) {
    const dirLower = dirRaw.toLowerCase().trim();
    if (preset?.directionMap) {
      direction = preset.directionMap[dirLower] || parseDirection(dirRaw);
    } else {
      direction = parseDirection(dirRaw);
    }
  } else if (preset?.quantitySignIsDirection) {
    // IBKR: negative quantity = sell/short
    const rawQty = parseNumber(get('quantity'));
    if (rawQty < 0) direction = 'short';
  }

  // Date parsing
  const entryDate = parseDate(get('entry_date'));
  const exitDateRaw = get('exit_date');
  const exitDate = exitDateRaw ? parseDate(exitDateRaw) : null;

  // ThinkOrSwim: Pos Effect determines entry vs exit
  if (preset?.posEffectField) {
    const posEffect = getFirstValue(row, preset.posEffectField);
    if (posEffect) {
      const pe = posEffect.toLowerCase();
      const isClosing = pe.includes('close') || pe === 'to close';
      if (isClosing) {
        return {
          symbol: symbol.toUpperCase().trim(),
          direction,
          entry_price: null,
          exit_price: entryPrice, // The price is actually the exit
          entry_date: entryDate,
          exit_date: entryDate,
          quantity,
          asset_class: detectAssetClass(symbol),
        };
      }
    }
  }

  return {
    symbol: symbol.toUpperCase().trim(),
    direction,
    entry_price: entryPrice,
    exit_price: !isNaN(exitPrice) ? exitPrice : null,
    entry_date: entryDate,
    exit_date: exitDate,
    quantity,
    pnl_amount: !isNaN(pnl) ? pnl : null,
    stop_loss: !isNaN(stopLoss) ? stopLoss : null,
    take_profit: !isNaN(takeProfit) ? takeProfit : null,
    asset_class: detectAssetClass(symbol),
  };
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function getFirstValue(row, candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && row[c] !== '') return row[c];
    // Also try case-insensitive
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (key && row[key] !== undefined && row[key] !== '') return row[key];
  }
  return null;
}

function getFirstMappedValue(row, mapping, field) {
  const col = mapping[field];
  return col ? (row[col] ?? '') : '';
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return NaN;
  // Remove currency symbols, thousands separators, whitespace
  const cleaned = String(val).replace(/[$€£¥,\s]/g, '').replace(/\((.+)\)/, '-$1');
  return parseFloat(cleaned);
}

function autoDetectColumns(firstRow) {
  const mapping = {};
  const keys = Object.keys(firstRow);
  const patterns = {
    symbol: /^(symbol|ticker|instrument|pair|item|underlying|instrument.?name)$/i,
    direction: /^(direction|side|type|action|order.?type|trans.?code|buy.?sell)$/i,
    entry_price: /^(entry.?price|open.?price|open.?rate|buy.?price|price|fill.?price|t\.?\s?price|trade.?price|price.?\/.?share)$/i,
    exit_price: /^(exit.?price|close.?price|close.?rate|sell.?price)$/i,
    entry_date: /^(entry.?date|open.?date|date.?opened|entry.?time|open.?time|exec.?time|date.?time|activity.?date|time|trading.?time|date)$/i,
    exit_date: /^(exit.?date|close.?date|date.?closed|exit.?time|close.?time)$/i,
    quantity: /^(quantity|qty|size|volume|lots|shares|contracts|units|no\.?\s?of\s?shares)$/i,
    pnl: /^(pnl|profit|p.?l|gain.?loss|result|net.?p.?l|realized.?p.?l|realized.?equity.?change)$/i,
    stop_loss: /^(stop.?loss|sl|stop|s\/l|stop.?loss.?rate)$/i,
    take_profit: /^(take.?profit|tp|target|t\/p|take.?profit.?rate)$/i,
  };

  for (const key of keys) {
    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(key.trim()) && !mapping[field]) {
        mapping[field] = key;
        break;
      }
    }
  }

  return mapping;
}

function parseDirection(direction) {
  if (!direction) return 'long';
  const d = direction.toLowerCase().trim();
  if (d.includes('short') || d === 'sell' || d === 's' || d === 'sld' ||
      d.includes('market sell') || d.includes('limit sell')) return 'short';
  return 'long';
}

// ────────────────────────────────────────────────────────────────
// Robust date parser
// Handles: ISO, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD,
//          DD/MM/YYYY HH:MM:SS, eToro dates, IBKR dates,
//          Trading 212 "2024-01-15T10:30:00+02:00", etc.
// ────────────────────────────────────────────────────────────────
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  dateStr = dateStr.trim();
  if (!dateStr) return null;

  // 1) Try native Date parsing (handles ISO 8601, RFC 2822, etc.)
  const nativeParsed = new Date(dateStr);
  if (!isNaN(nativeParsed.getTime())) {
    // Sanity check: year should be between 1990 and 2100
    const yr = nativeParsed.getFullYear();
    if (yr >= 1990 && yr <= 2100) {
      return nativeParsed.toISOString();
    }
  }

  // 2) Strip time portion if present: "15/02/2026 14:30:00" → "15/02/2026"
  const dateTimeParts = dateStr.split(/[\sT]+/);
  const datePart = dateTimeParts[0];
  const timePart = dateTimeParts[1] || '';

  // 3) Try splitting by common separators
  const parts = datePart.split(/[/\-\.]/);
  if (parts.length === 3) {
    let [a, b, c] = parts.map(p => parseInt(p, 10));
    if (isNaN(a) || isNaN(b) || isNaN(c)) return null;

    let year, month, day;

    if (a > 100) {
      // YYYY-MM-DD (a is the year)
      year = a; month = b; day = c;
    } else if (c > 100) {
      // DD/MM/YYYY or MM/DD/YYYY (c is the year)
      if (a > 12) {
        // Must be DD/MM/YYYY (a > 12 can't be month)
        day = a; month = b; year = c;
      } else if (b > 12) {
        // Must be MM/DD/YYYY (b > 12 can't be month)
        month = a; day = b; year = c;
      } else {
        // Ambiguous: default to DD/MM/YYYY (most brokers are international)
        day = a; month = b; year = c;
      }
    } else if (c >= 0 && c < 100) {
      // Two-digit year: DD/MM/YY
      year = c < 50 ? 2000 + c : 1900 + c;
      if (a > 12) {
        day = a; month = b;
      } else {
        day = a; month = b; // Default DD/MM
      }
    } else {
      return null;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Reconstruct with time if present
    let hours = 0, minutes = 0, seconds = 0;
    if (timePart) {
      const tp = timePart.split(/[:.]/);
      hours = parseInt(tp[0], 10) || 0;
      minutes = parseInt(tp[1], 10) || 0;
      seconds = parseInt(tp[2], 10) || 0;
    }

    const result = new Date(year, month - 1, day, hours, minutes, seconds);
    if (!isNaN(result.getTime())) {
      return result.toISOString();
    }
  }

  return null;
}

function detectAssetClass(symbol) {
  if (!symbol) return 'other';
  const s = symbol.toUpperCase().trim();

  // Forex pairs (6 chars, both halves are known currencies)
  const fxCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
  if (s.length === 6 && fxCurrencies.includes(s.slice(0, 3)) && fxCurrencies.includes(s.slice(3))) {
    return 'forex';
  }
  // Also match pairs with separator: EUR/USD, EUR_USD
  if (/^[A-Z]{3}[/_][A-Z]{3}$/.test(s) && fxCurrencies.includes(s.slice(0, 3))) {
    return 'forex';
  }

  // Crypto
  if (/(BTC|ETH|XRP|SOL|DOGE|USDT|USDC|ADA|DOT|AVAX|MATIC|LINK|SHIB)/.test(s) ||
      s.endsWith('USD') && s.length > 6) {
    return 'crypto';
  }

  // Futures (common patterns)
  if (/^(ES|NQ|YM|CL|GC|SI|ZB|ZN|RTY|MES|MNQ|MCL)/.test(s)) {
    return 'futures';
  }

  return 'stock';
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};
