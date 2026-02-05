/**
 * eToro Market Recommendations API Proxy
 * GET /api/journal/etoro/market-recommendations
 *
 * Endpoint: https://public-api.etoro.com/api/v1/market-recommendations/{itemsCount}
 * Returns trending/hot assets based on eToro's social and trading data
 */

import { v4 as uuidv4 } from 'uuid';

const sampleRecommendations = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change: 4.2, assetType: 'stocks' },
  { symbol: 'BTC', name: 'Bitcoin', price: 97250.00, change: 2.8, assetType: 'crypto' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: 3.5, assetType: 'stocks' },
  { symbol: 'ETH', name: 'Ethereum', price: 3420.00, change: 1.9, assetType: 'crypto' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 195.20, change: 0.8, assetType: 'stocks' },
  { symbol: 'SOL', name: 'Solana', price: 198.50, change: 5.1, assetType: 'crypto' },
  { symbol: 'META', name: 'Meta Platforms', price: 520.40, change: 1.2, assetType: 'stocks' },
  { symbol: 'GOLD', name: 'Gold', price: 2045.80, change: 0.3, assetType: 'commodities' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.60, change: 0.9, assetType: 'stocks' },
  { symbol: 'XRP', name: 'Ripple', price: 2.35, change: 6.7, assetType: 'crypto' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 185.70, change: 1.5, assetType: 'stocks' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 155.30, change: 0.6, assetType: 'stocks' },
  { symbol: 'ADA', name: 'Cardano', price: 0.98, change: 3.2, assetType: 'crypto' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 502.80, change: 0.4, assetType: 'etfs' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.32, change: 8.4, assetType: 'crypto' },
  { symbol: 'OIL', name: 'Crude Oil', price: 78.20, change: -0.5, assetType: 'commodities' },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: 625.10, change: 2.1, assetType: 'stocks' },
  { symbol: 'DOT', name: 'Polkadot', price: 7.85, change: 4.8, assetType: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', price: 15.20, change: 3.9, assetType: 'crypto' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 438.60, change: 0.7, assetType: 'etfs' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;
  const { count = '10' } = req.query;

  const itemsCount = Math.min(Math.max(parseInt(count) || 10, 1), 50);

  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      recommendations: sampleRecommendations.slice(0, itemsCount),
      source: 'sample',
      count: itemsCount,
    });
  }

  try {
    const url = `https://public-api.etoro.com/api/v1/market-recommendations/${itemsCount}`;

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
    console.log('eToro recommendations status:', response.status);
    console.log('eToro recommendations response:', responseText ? responseText.substring(0, 500) : '(empty)');

    if (!responseText || responseText.trim() === '') {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({
        recommendations: sampleRecommendations.slice(0, itemsCount),
        source: 'sample',
        count: itemsCount,
      });
    }

    if (!response.ok) {
      console.error('eToro recommendations API error:', response.status, responseText);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({
        recommendations: sampleRecommendations.slice(0, itemsCount),
        source: 'sample',
        count: itemsCount,
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro recommendations JSON parse error:', parseError);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({
        recommendations: sampleRecommendations.slice(0, itemsCount),
        source: 'sample',
        count: itemsCount,
      });
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
      const recommendations = rawItems.map(item => {
        const symbol = item.symbolFull || item.SymbolFull || item.symbol || item.Symbol ||
                       item.ticker || item.Ticker || item.displayName || item.DisplayName || '';
        const bid = item.bid || item.Bid || 0;
        const ask = item.ask || item.Ask || 0;
        const price = (bid && ask) ? (bid + ask) / 2 : (item.lastPrice || item.LastPrice || item.price || item.Price || 0);
        const change = item.changePercent || item.ChangePercent || item.dailyChangePercent ||
                       item.DailyChangePercent || item.change || item.Change || 0;

        const typeRaw = (item.assetType || item.AssetType || item.instrumentType || item.InstrumentType || '').toLowerCase();
        let assetType = 'stocks';
        if (typeRaw.includes('crypto') || typeRaw.includes('currency') && !typeRaw.includes('forex')) assetType = 'crypto';
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
      }).filter(r => r.symbol);

      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({
        recommendations,
        source: 'etoro',
        count: recommendations.length,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      recommendations: sampleRecommendations.slice(0, itemsCount),
      source: 'sample',
      count: itemsCount,
    });
  } catch (error) {
    console.error('eToro recommendations error:', error);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      recommendations: sampleRecommendations.slice(0, itemsCount),
      source: 'sample',
      count: itemsCount,
    });
  }
}
