/**
 * eToro CopyTrader Leaderboard API Proxy
 * GET /api/journal/etoro/copytraders
 *
 * Returns top CopyTraders - tries eToro API first, falls back to sample data
 */

// Sample CopyTraders data
const sampleCopyTraders = [
  { username: 'jaynemesis', name: 'Jay Smith', gain: 32.5, copiers: 15234, riskScore: 4 },
  { username: 'tradeguru', name: 'Sarah Johnson', gain: 28.7, copiers: 12456, riskScore: 3 },
  { username: 'cryptoking', name: 'Mike Chen', gain: 45.2, copiers: 9876, riskScore: 6 },
  { username: 'stockmaster', name: 'David Lee', gain: 22.3, copiers: 8765, riskScore: 3 },
  { username: 'forexwizard', name: 'Emma Wilson', gain: 18.9, copiers: 7654, riskScore: 4 },
  { username: 'techtrader', name: 'Alex Brown', gain: 35.1, copiers: 6543, riskScore: 5 },
  { username: 'valueinvest', name: 'Robert Taylor', gain: 15.8, copiers: 5432, riskScore: 2 },
  { username: 'growthpro', name: 'Lisa Anderson', gain: 27.4, copiers: 4321, riskScore: 4 },
  { username: 'etfmaster', name: 'John Martinez', gain: 12.6, copiers: 3210, riskScore: 2 },
  { username: 'dividendking', name: 'Anna Thompson', gain: 19.3, copiers: 2109, riskScore: 3 },
  { username: 'momentumtrade', name: 'Chris Garcia', gain: 41.2, copiers: 1987, riskScore: 6 },
  { username: 'swingtrader', name: 'Jennifer White', gain: 24.8, copiers: 1876, riskScore: 4 },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;

  // If API keys are not configured, return sample data
  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample' });
  }

  try {
    const response = await fetch('https://api.etoro.com/api/v1/pi-data/copytraders', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
      return res.status(200).json({ traders: data.traders || data || [], source: 'etoro' });
    }

    // API call failed, return sample data
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample' });
  } catch (error) {
    console.error('eToro copytraders error:', error);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample' });
  }
}
