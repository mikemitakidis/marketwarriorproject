/**
 * eToro Market Data API Proxy
 * GET /api/journal/market-data
 *
 * Uses eToro /api/v1/market-data/instruments/rates for live prices
 */

import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;

  if (!apiKey || !userKey) {
    return res.status(500).json({ error: 'eToro API keys not configured', prices: {} });
  }

  try {
    const url = 'https://public-api.etoro.com/api/v1/market-data/instruments/rates';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'x-request-id': uuidv4(),
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('eToro rates status:', response.status);
    console.log('eToro rates response:', responseText ? responseText.substring(0, 1500) : '(empty)');

    if (!responseText || responseText.trim() === '') {
      return res.status(500).json({ error: 'Empty response from eToro', prices: {} });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `eToro error: ${response.status}`, prices: {} });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from eToro', prices: {} });
    }

    console.log('eToro rates data keys:', Object.keys(data || {}));

    // Find the rates array
    let rates = [];
    if (Array.isArray(data)) {
      rates = data;
    } else if (data && typeof data === 'object') {
      rates = data.rates || data.Rates || data.items || data.Items || data.instruments || data.Instruments || [];
    }

    if (rates.length > 0) {
      console.log('First rate keys:', Object.keys(rates[0]));
      console.log('First rate:', JSON.stringify(rates[0]));
    }

    // Build prices object keyed by symbol
    const prices = {};
    for (const rate of rates) {
      const symbol = rate.symbolFull || rate.SymbolFull || rate.symbol || rate.Symbol ||
                     rate.ticker || rate.Ticker || rate.instrumentDisplayName || rate.InstrumentDisplayName ||
                     rate.displayName || rate.DisplayName;

      if (!symbol) continue;

      const bid = rate.bid || rate.Bid || 0;
      const ask = rate.ask || rate.Ask || 0;
      const price = (bid && ask) ? (bid + ask) / 2 : (rate.lastPrice || rate.LastPrice || rate.price || rate.Price || 0);
      const change = rate.changePercent || rate.ChangePercent || rate.dailyChangePercent || rate.DailyChangePercent || 0;

      prices[symbol] = { price, change, bid, ask };
    }

    console.log('Total prices:', Object.keys(prices).length);
    console.log('Sample symbols:', Object.keys(prices).slice(0, 20));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ prices, count: Object.keys(prices).length });

  } catch (err) {
    console.error('Market data error:', err);
    return res.status(500).json({ error: err.message, prices: {} });
  }
}
