/**
 * eToro Market Movers API Proxy
 * GET /api/journal/etoro/market-movers
 *
 * Uses: https://public-api.etoro.com/api/v1/market-data/instruments/rates
 * Required headers: x-api-key, x-user-key, x-request-id
 *
 * Logic: Fetches instrument rates, sorts by DailyChangePercentage to find
 * top gainers and losers
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

// Major instrument IDs to track (popular stocks and crypto)
// These are example eToro instrument IDs - adjust based on actual IDs
const TRACKED_INSTRUMENTS = [
  // Will use instrument IDs from eToro - for now fetching all available
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
    // Fetch instrument rates from eToro
    const response = await fetch('https://public-api.etoro.com/api/v1/market-data/instruments/rates', {
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

      // Extract instruments with price data
      const instruments = data.Rates || data.Instruments || data || [];

      // Map to our format and filter out items without change data
      const mappedInstruments = instruments
        .filter(item => item.DailyChangePercentage !== undefined || item.PercentChange !== undefined)
        .map(item => ({
          symbol: item.Symbol || item.SymbolFull || item.InstrumentDisplayName || item.Name,
          name: item.InstrumentDisplayName || item.Name || item.Symbol,
          price: item.Price || item.LastPrice || item.Ask,
          change: item.DailyChangePercentage || item.PercentChange || item.Change || 0,
        }));

      // Sort by change percentage
      const sorted = [...mappedInstruments].sort((a, b) => b.change - a.change);

      // Get top 5 gainers (highest positive change)
      const gainers = sorted.filter(i => i.change > 0).slice(0, 5);

      // Get top 5 losers (most negative change)
      const losers = sorted.filter(i => i.change < 0).slice(-5).reverse();

      const assets = type === 'losers' ? losers : gainers;

      // If we got real data, return it
      if (assets.length > 0) {
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
        return res.status(200).json({ assets, source: 'etoro' });
      }
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
