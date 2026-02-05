/**
 * eToro Curated Lists API Proxy
 * GET /api/journal/etoro/curated-lists
 *
 * Returns curated watchlists - tries eToro API first, falls back to sample data
 */

// Sample curated lists data
const sampleLists = [
  { id: 1, name: 'Big Tech', description: 'Major technology companies driving innovation', count: 10 },
  { id: 2, name: 'Crypto Portfolio', description: 'Top cryptocurrencies by market cap', count: 15 },
  { id: 3, name: 'Dividend Champions', description: 'Companies with consistent dividend growth', count: 20 },
  { id: 4, name: 'Growth Stocks', description: 'High-growth potential companies', count: 12 },
  { id: 5, name: 'EV Revolution', description: 'Electric vehicle and clean energy stocks', count: 8 },
  { id: 6, name: 'AI & Robotics', description: 'Companies leading in artificial intelligence', count: 10 },
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
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  }

  try {
    const response = await fetch('https://api.etoro.com/api/v1/curated-lists', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ lists: data.lists || data || [], source: 'etoro' });
    }

    // API call failed, return sample data
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  } catch (error) {
    console.error('eToro curated-lists error:', error);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  }
}
