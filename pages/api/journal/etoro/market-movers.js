/**
 * eToro Market Movers API Proxy
 * GET /api/journal/etoro/market-movers
 *
 * Returns top gainers and losers - tries eToro API first, falls back to sample data
 */

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
    const response = await fetch(`https://api.etoro.com/api/v1/market-data/movers?type=${type}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
      return res.status(200).json({ assets: data.assets || data || [], source: 'etoro' });
    }

    // API call failed, return sample data
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  } catch (error) {
    console.error('eToro market-movers error:', error);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  }
}
