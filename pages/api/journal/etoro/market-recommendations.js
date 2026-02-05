/**
 * eToro Market Recommendations API Proxy
 * GET /api/journal/etoro/market-recommendations
 *
 * 1. Fetches trending instruments from /api/v1/market-recommendations/{itemsCount}
 * 2. Fetches live prices from /api/v1/market-data/instruments/rates
 * 3. Merges: trending symbols + real live prices
 */

import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;
  const { count = '10' } = req.query;

  const itemsCount = Math.min(Math.max(parseInt(count) || 10, 1), 50);

  if (!apiKey || !userKey) {
    return res.status(500).json({ error: 'eToro API keys not configured', recommendations: [] });
  }

  const headers = {
    'x-api-key': apiKey,
    'x-user-key': userKey,
    'x-request-id': uuidv4(),
    'Content-Type': 'application/json',
  };

  try {
    // Call BOTH endpoints in parallel:
    // 1. Recommendations (trending symbols)
    // 2. Live rates (real prices)
    const [recsRes, ratesRes] = await Promise.all([
      fetch(`https://public-api.etoro.com/api/v1/market-recommendations/${itemsCount}`, { method: 'GET', headers }),
      fetch('https://public-api.etoro.com/api/v1/market-data/instruments/rates', { method: 'GET', headers: { ...headers, 'x-request-id': uuidv4() } }),
    ]);

    const recsText = await recsRes.text();
    const ratesText = await ratesRes.text();

    console.log('eToro recommendations status:', recsRes.status);
    console.log('eToro recommendations response:', recsText ? recsText.substring(0, 500) : '(empty)');
    console.log('eToro rates status:', ratesRes.status);

    // Parse rates into a lookup map: symbol -> { price, change, bid, ask }
    const priceMap = {};
    try {
      const ratesData = JSON.parse(ratesText);
      let rates = [];
      if (Array.isArray(ratesData)) {
        rates = ratesData;
      } else if (ratesData && typeof ratesData === 'object') {
        rates = ratesData.rates || ratesData.Rates ||
                ratesData.items || ratesData.Items || [];
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
          priceMap[symbol] = { price, change, bid, ask };
          // Also store lowercase for matching
          priceMap[symbol.toLowerCase()] = { price, change, bid, ask };
        }
      }
      console.log('Rates price map size:', Object.keys(priceMap).length / 2);
    } catch (e) {
      console.log('Rates parse error:', e.message);
    }

    // Parse recommendations
    if (recsText && recsText.trim()) {
      let data;
      try {
        data = JSON.parse(recsText);
      } catch (e) {
        console.error('Recommendations parse error:', e.message);
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ recommendations: [], source: 'error', count: 0 });
      }

      let rawItems = [];
      if (Array.isArray(data)) {
        rawItems = data;
      } else if (data && typeof data === 'object') {
        rawItems = data.recommendations || data.Recommendations ||
                   data.items || data.Items ||
                   data.results || data.Results ||
                   data.instruments || data.Instruments || [];
      }

      if (rawItems.length > 0) {
        console.log('Recommendations first item:', JSON.stringify(rawItems[0]).substring(0, 500));

        const recommendations = rawItems.map(item => {
          const symbol = item.symbolFull || item.SymbolFull || item.symbol || item.Symbol ||
                         item.ticker || item.Ticker || item.displayName || item.DisplayName || '';
          if (!symbol) return null;

          // Try to get live price from rates
          const liveData = priceMap[symbol] || priceMap[symbol.toLowerCase()] || priceMap[symbol.toUpperCase()];

          // Use live price if available, otherwise use whatever the recommendations endpoint gives us
          const bid = item.bid || item.Bid || 0;
          const ask = item.ask || item.Ask || 0;
          const recPrice = (bid && ask) ? (bid + ask) / 2 : (item.lastPrice || item.LastPrice || item.price || item.Price || 0);
          const recChange = item.changePercent || item.ChangePercent || item.dailyChangePercent ||
                            item.DailyChangePercent || item.change || item.Change || 0;

          const price = liveData?.price || recPrice;
          const change = liveData?.change || recChange;

          const typeRaw = (item.assetType || item.AssetType || item.instrumentType || item.InstrumentType || '').toLowerCase();
          let assetType = 'stocks';
          if (typeRaw.includes('crypto') || (typeRaw.includes('currency') && !typeRaw.includes('forex'))) assetType = 'crypto';
          else if (typeRaw.includes('etf')) assetType = 'etfs';
          else if (typeRaw.includes('commodit') || typeRaw.includes('gold') || typeRaw.includes('oil')) assetType = 'commodities';
          else if (typeRaw.includes('index') || typeRaw.includes('indices')) assetType = 'indices';
          else if (typeRaw.includes('forex') || typeRaw.includes('fx')) assetType = 'forex';

          return {
            symbol,
            name: item.displayName || item.DisplayName || item.name || item.Name || symbol,
            price,
            change,
            assetType,
            instrumentId: item.instrumentId || item.InstrumentId,
          };
        }).filter(r => r && r.symbol);

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({
          recommendations,
          source: 'etoro',
          count: recommendations.length,
        });
      }
    }

    // If recommendations endpoint returned nothing, return empty (no fake data)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      recommendations: [],
      source: 'empty',
      count: 0,
    });
  } catch (error) {
    console.error('eToro recommendations error:', error);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      recommendations: [],
      source: 'error',
      count: 0,
    });
  }
}
