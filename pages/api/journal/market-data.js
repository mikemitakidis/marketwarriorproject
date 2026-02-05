/**
 * eToro Market Data API Proxy
 * GET /api/journal/market-data
 *
 * Uses the search endpoint with support for:
 * - q (query string) - search for specific instruments
 * - assetType - filter by asset type (stocks, crypto, etfs, indices, commodities, forex)
 * - exchange - filter by stock exchange (NASDAQ, NYSE, etc.)
 *
 * Also fetches live rates from instruments/rates endpoint
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

  const headers = {
    'x-api-key': apiKey,
    'x-user-key': userKey,
    'x-request-id': uuidv4(),
    'Content-Type': 'application/json',
  };

  try {
    const { query, popular, assetType, exchange } = req.query;

    // Main/popular instruments to show by default
    const POPULAR_INSTRUMENTS = [
      'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX',
      'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE',
      'GOLD', 'SILVER', 'OIL',
      'SPY', 'QQQ',
      'EURUSD', 'GBPUSD'
    ];

    // Build search URL with query parameters
    let searchUrl = 'https://public-api.etoro.com/api/v1/market-data/search';
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (assetType) params.set('assetType', assetType);
    if (exchange) params.set('exchange', exchange);
    const paramString = params.toString();
    if (paramString) {
      searchUrl += `?${paramString}`;
    }

    // Call BOTH endpoints in parallel
    const [searchRes, ratesRes] = await Promise.all([
      fetch(searchUrl, { method: 'GET', headers }),
      fetch('https://public-api.etoro.com/api/v1/market-data/instruments/rates', { method: 'GET', headers }),
    ]);

    const searchText = await searchRes.text();
    const ratesText = await ratesRes.text();

    console.log('eToro search status:', searchRes.status);
    console.log('eToro search response:', searchText ? searchText.substring(0, 1000) : '(empty)');
    console.log('eToro rates status:', ratesRes.status);
    console.log('eToro rates response:', ratesText ? ratesText.substring(0, 1000) : '(empty)');

    let searchData = null;
    let ratesData = null;

    try { searchData = JSON.parse(searchText); } catch (e) { console.log('Search parse error'); }
    try { ratesData = JSON.parse(ratesText); } catch (e) { console.log('Rates parse error'); }

    console.log('Search data keys:', Object.keys(searchData || {}));
    console.log('Rates data keys:', Object.keys(ratesData || {}));

    // Build prices from both sources
    const prices = {};

    // Process SEARCH results
    if (searchData) {
      let instruments = [];
      if (Array.isArray(searchData)) {
        instruments = searchData;
      } else {
        instruments = searchData.instruments || searchData.Instruments ||
                      searchData.items || searchData.Items ||
                      searchData.results || searchData.Results || [];
      }

      if (instruments.length > 0) {
        console.log('Search first item:', JSON.stringify(instruments[0]).substring(0, 500));
      }

      for (const inst of instruments) {
        const symbol = inst.symbolFull || inst.SymbolFull || inst.symbol || inst.Symbol ||
                       inst.ticker || inst.Ticker || inst.displayName || inst.DisplayName;
        if (!symbol) continue;

        const bid = inst.bid || inst.Bid || 0;
        const ask = inst.ask || inst.Ask || 0;
        const price = (bid && ask) ? (bid + ask) / 2 : (inst.lastPrice || inst.LastPrice || inst.price || inst.Price || 0);
        const change = inst.changePercent || inst.ChangePercent || inst.dailyChangePercent || inst.DailyChangePercent || 0;

        const typeRaw = (inst.assetType || inst.AssetType || inst.instrumentType || inst.InstrumentType || '').toLowerCase();
        const instExchange = inst.exchange || inst.Exchange || inst.exchangeName || inst.ExchangeName || '';

        if (price > 0) {
          prices[symbol] = {
            price, change, bid, ask,
            name: inst.displayName || inst.DisplayName || inst.name || inst.Name || symbol,
            instrumentId: inst.instrumentId || inst.InstrumentId,
            assetType: typeRaw,
            exchange: instExchange,
          };
        }
      }
    }

    // Process RATES results (may have more up-to-date prices)
    if (ratesData) {
      let rates = [];
      if (Array.isArray(ratesData)) {
        rates = ratesData;
      } else {
        rates = ratesData.rates || ratesData.Rates ||
                ratesData.items || ratesData.Items || [];
      }

      if (rates.length > 0) {
        console.log('Rates first item:', JSON.stringify(rates[0]).substring(0, 500));
      }

      for (const rate of rates) {
        const symbol = rate.symbolFull || rate.SymbolFull || rate.symbol || rate.Symbol ||
                       rate.ticker || rate.Ticker || rate.displayName || rate.DisplayName;
        if (!symbol) continue;

        const bid = rate.bid || rate.Bid || 0;
        const ask = rate.ask || rate.Ask || 0;
        const price = (bid && ask) ? (bid + ask) / 2 : (rate.lastPrice || rate.LastPrice || rate.price || rate.Price || 0);
        const change = rate.changePercent || rate.ChangePercent || rate.dailyChangePercent || rate.DailyChangePercent || 0;

        if (price > 0) {
          // Update or add price data
          prices[symbol] = {
            ...prices[symbol],
            price, change, bid, ask,
            name: prices[symbol]?.name || rate.displayName || rate.DisplayName || symbol,
          };
        }
      }
    }

    console.log('Total prices:', Object.keys(prices).length);
    console.log('Sample symbols:', Object.keys(prices).slice(0, 20));

    // Filter to popular instruments if requested or if no search query and no filters
    let finalPrices = prices;
    if (popular === 'true' || (!query && !assetType && !exchange && Object.keys(prices).length > 30)) {
      const filtered = {};
      for (const symbol of POPULAR_INSTRUMENTS) {
        // Try exact match first
        if (prices[symbol]) {
          filtered[symbol] = prices[symbol];
        } else {
          // Try case-insensitive match
          const found = Object.entries(prices).find(([k]) =>
            k.toUpperCase() === symbol.toUpperCase() ||
            k.toUpperCase().includes(symbol.toUpperCase())
          );
          if (found) {
            filtered[found[0]] = found[1];
          }
        }
      }
      // If we found popular instruments, use them; otherwise show all
      if (Object.keys(filtered).length > 0) {
        finalPrices = filtered;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ prices: finalPrices, count: Object.keys(finalPrices).length, total: Object.keys(prices).length });

  } catch (err) {
    console.error('Market data error:', err);
    return res.status(500).json({ error: err.message, prices: {} });
  }
}
