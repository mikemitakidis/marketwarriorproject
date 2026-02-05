/**
 * eToro Market Movers API Proxy
 * GET /api/journal/etoro/market-movers
 *
 * Endpoint: https://public-api.etoro.com/api/v1/market-data/movers
 * Required headers: x-api-key, x-user-key, x-request-id
 */

import { v4 as uuidv4 } from 'uuid';

// Sample gainers data
const sampleGainers = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', change: 5.67 },
  { symbol: 'AMD', name: 'AMD Inc.', change: 4.23 },
  { symbol: 'COIN', name: 'Coinbase Global', change: 3.89 },
  { symbol: 'PLTR', name: 'Palantir Tech.', change: 3.45 },
  { symbol: 'MARA', name: 'Marathon Digital', change: 3.12 },
];

// Sample losers data
const sampleLosers = [
  { symbol: 'RIVN', name: 'Rivian Automotive', change: -4.56 },
  { symbol: 'LCID', name: 'Lucid Group', change: -3.78 },
  { symbol: 'NIO', name: 'NIO Inc.', change: -3.21 },
  { symbol: 'SNAP', name: 'Snap Inc.', change: -2.89 },
  { symbol: 'PYPL', name: 'PayPal Holdings', change: -2.45 },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;
  const { type = 'gainers' } = req.query;

  const sampleData = type === 'losers' ? sampleLosers : sampleGainers;

  // If API keys are not configured, return sample data
  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  }

  try {
    const response = await fetch(`https://public-api.etoro.com/api/v1/market-data/movers?type=${type}`, {
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
      const assets = (data.Movers || data.Assets || data || []).map(item => ({
        symbol: item.Symbol || item.SymbolFull || item.InstrumentDisplayName,
        name: item.Name || item.InstrumentDisplayName,
        change: item.Change || item.DailyChange || item.PercentChange,
      }));
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
      return res.status(200).json({ assets, source: 'etoro' });
    }

    // Log error for debugging
    const errorText = await response.text();
    console.error('eToro market-movers API error:', response.status, errorText);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  } catch (error) {
    console.error('eToro market-movers error:', error);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  }
}
