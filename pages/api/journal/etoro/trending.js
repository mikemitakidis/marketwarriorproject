/**
 * eToro Trending Assets API Proxy
 * GET /api/journal/etoro/trending
 *
 * Endpoint: https://public-api.etoro.com/api/v1/watchlists/market-recommendations
 * Required headers: x-api-key, x-user-key, x-request-id
 */

import { v4 as uuidv4 } from 'uuid';

// Sample trending data as fallback
const sampleTrending = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67234.50, change: 2.45 },
  { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change: 1.23 },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.92, change: 0.85 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.67, change: -1.34 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.23, change: 3.67 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.34, change: 0.92 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 156.78, change: 1.15 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.45, change: 0.67 },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;

  // If API keys are not configured, return sample data
  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ assets: sampleTrending, source: 'sample' });
  }

  try {
    const response = await fetch('https://public-api.etoro.com/api/v1/watchlists/market-recommendations', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'x-request-id': uuidv4(),
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Transform eToro response format - adjust based on actual response structure
      const assets = (data.Recommendations || data.Assets || data || []).map(item => ({
        symbol: item.Symbol || item.SymbolFull || item.InstrumentDisplayName,
        name: item.Name || item.InstrumentDisplayName,
        price: item.Price || item.LastPrice,
        change: item.Change || item.DailyChange || item.PercentChange,
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ assets, source: 'etoro' });
    }

    // Log error for debugging
    const errorText = await response.text();
    console.error('eToro trending API error:', response.status, errorText);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ assets: sampleTrending, source: 'sample' });
  } catch (error) {
    console.error('eToro trending error:', error);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ assets: sampleTrending, source: 'sample' });
  }
}
