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

    const responseText = await response.text();
    console.log('eToro curated-lists response status:', response.status);
    console.log('eToro curated-lists response length:', responseText.length);
    console.log('eToro curated-lists response:', responseText ? responseText.substring(0, 500) : '(empty)');

    // Handle empty response
    if (!responseText || responseText.trim() === '') {
      console.error('eToro curated-lists returned empty response');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ lists: sampleLists, source: 'sample' });
    }

    if (!response.ok) {
      console.error('eToro curated-lists API error:', response.status, responseText);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ lists: sampleLists, source: 'sample' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro curated-lists JSON parse error:', parseError);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ lists: sampleLists, source: 'sample' });
    }

    console.log('eToro curated-lists data keys:', Object.keys(data || {}));

    // Handle various response formats
    let rawLists = [];
    if (Array.isArray(data)) {
      rawLists = data;
    } else if (data && typeof data === 'object') {
      rawLists = data.CuratedLists || data.Lists || data.Items || data.Results || [];
    }

    if (Array.isArray(rawLists) && rawLists.length > 0) {
      const lists = rawLists.map(list => ({
        id: list.Uuid || list.Id || list.id,
        name: list.Name || list.name,
        description: list.Description || list.description,
        imageUrl: list.ListImageUrl || list.ImageUrl || list.imageUrl,
        count: list.Items?.length || list.Count || list.count || 0,
      }));
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ lists, source: 'etoro' });
    }

    // No valid data found, return sample
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  } catch (error) {
    console.error('eToro curated-lists error:', error);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ lists: sampleLists, source: 'sample' });
  }
}
