/**
 * eToro Curated Lists API Proxy
 * GET /api/journal/etoro/curated-lists
 *
 * Endpoint: https://public-api.etoro.com/api/v1/curated-lists
 * Required headers: x-api-key, x-user-key, x-request-id
 */

import { v4 as uuidv4 } from 'uuid';

// Sample curated lists data as fallback
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
    const response = await fetch('https://public-api.etoro.com/api/v1/curated-lists', {
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
      // Transform eToro response format to our format
      const lists = (data.CuratedLists || []).map(list => ({
        id: list.Uuid,
        name: list.Name,
        description: list.Description,
        imageUrl: list.ListImageUrl,
        count: list.Items?.length || 0,
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ lists, source: 'etoro' });
    }

    // Log error for debugging
    const errorText = await response.text();
    console.error('eToro curated-lists API error:', response.status, errorText);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  } catch (error) {
    console.error('eToro curated-lists error:', error);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  }
}
