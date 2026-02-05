/**
 * eToro Market Data API Proxy
 * GET /api/journal/market-data
 *
 * First searches for instruments, then gets their rates
 */

import { v4 as uuidv4 } from 'uuid';

// Instruments to fetch - popular tradable assets on eToro
const INSTRUMENTS_TO_FETCH = [
  'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX',
  'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'LINK',
  'SPY', 'QQQ', 'GOLD', 'SILVER', 'OIL',
  'EURUSD', 'GBPUSD', 'USDJPY'
];

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
    // Step 1: Search for instruments to get their IDs
    const searchUrl = 'https://public-api.etoro.com/api/v1/market-data/search';

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'x-request-id': uuidv4(),
        'Content-Type': 'application/json',
      },
    });

    const searchText = await searchResponse.text();
    console.log('eToro search status:', searchResponse.status);
    console.log('eToro search response:', searchText ? searchText.substring(0, 2000) : '(empty)');

    if (!searchResponse.ok || !searchText) {
      return res.status(searchResponse.status || 500).json({
        error: `eToro search error: ${searchResponse.status}`,
        prices: {}
      });
    }

    let searchData;
    try {
      searchData = JSON.parse(searchText);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from search', prices: {} });
    }

    console.log('eToro search data keys:', Object.keys(searchData || {}));

    // Find instruments array
    let instruments = [];
    if (Array.isArray(searchData)) {
      instruments = searchData;
    } else if (searchData && typeof searchData === 'object') {
      instruments = searchData.instruments || searchData.Instruments ||
                    searchData.items || searchData.Items ||
                    searchData.results || searchData.Results || [];
    }

    if (instruments.length > 0) {
      console.log('First instrument keys:', Object.keys(instruments[0]));
      console.log('First instrument:', JSON.stringify(instruments[0]).substring(0, 500));
      console.log('Total instruments:', instruments.length);
    }

    // Build prices from search results (which may include price data)
    const prices = {};

    for (const inst of instruments) {
      const symbol = inst.symbolFull || inst.SymbolFull || inst.symbol || inst.Symbol ||
                     inst.ticker || inst.Ticker || inst.displayName || inst.DisplayName ||
                     inst.instrumentDisplayName || inst.InstrumentDisplayName;

      if (!symbol) continue;

      // Get price data if available
      const bid = inst.bid || inst.Bid || inst.lastBid || inst.LastBid || 0;
      const ask = inst.ask || inst.Ask || inst.lastAsk || inst.LastAsk || 0;
      const price = (bid && ask) ? (bid + ask) / 2 :
                    (inst.lastPrice || inst.LastPrice || inst.price || inst.Price ||
                     inst.closingPrice || inst.ClosingPrice || 0);
      const change = inst.changePercent || inst.ChangePercent ||
                     inst.dailyChangePercent || inst.DailyChangePercent ||
                     inst.priceChangePercent || inst.PriceChangePercent || 0;

      if (price > 0) {
        prices[symbol] = {
          price,
          change,
          bid,
          ask,
          name: inst.displayName || inst.DisplayName || inst.name || inst.Name || symbol,
          instrumentId: inst.instrumentId || inst.InstrumentId,
        };
      }
    }

    console.log('Total prices with data:', Object.keys(prices).length);
    console.log('Sample symbols:', Object.keys(prices).slice(0, 20));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ prices, count: Object.keys(prices).length });

  } catch (err) {
    console.error('Market data error:', err);
    return res.status(500).json({ error: err.message, prices: {} });
  }
}
