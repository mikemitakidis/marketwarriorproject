/**
 * eToro Curated Lists API Proxy
 * GET /api/journal/etoro/curated-lists
 *
 * Fetches curated watchlists from eToro API
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;

  if (!apiKey || !userKey) {
    return res.status(500).json({ error: 'eToro API not configured' });
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

    if (!response.ok) {
      console.error('eToro API error:', response.status, await response.text());
      return res.status(response.status).json({ error: 'Failed to fetch from eToro API' });
    }

    const data = await response.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (error) {
    console.error('eToro curated-lists error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
