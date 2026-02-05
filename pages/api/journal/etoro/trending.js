/**
 * eToro Trending Assets API Proxy
 * GET /api/journal/etoro/trending
 *
 * Endpoint: https://public-api.etoro.com/api/v1/market-recommendations/{itemsCount}
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

  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ assets: sampleTrending, source: 'sample' });
  }

  try {
    const url = 'https://public-api.etoro.com/api/v1/market-recommendations/10';

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
    console.log('eToro trending response status:', response.status);
    console.log('eToro trending response length:', responseText.length);
    console.log('eToro trending response:', responseText ? responseText.substring(0, 500) : '(empty)');

    // Handle empty response
    if (!responseText || responseText.trim() === '') {
      console.error('eToro trending returned empty response');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ assets: sampleTrending, source: 'sample' });
    }

    if (!response.ok) {
      console.error('eToro trending API error:', response.status, responseText);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ assets: sampleTrending, source: 'sample' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro trending JSON parse error:', parseError);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({ assets: sampleTrending, source: 'sample' });
    }

    console.log('eToro trending data keys:', Object.keys(data));

    // eToro returns instrument IDs - check both camelCase and PascalCase
    const instrumentIds = data.recommendations || data.Recommendations || [];
    if (Array.isArray(instrumentIds) && instrumentIds.length > 0) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json({
        instrumentIds,
        assets: sampleTrending,
        source: 'etoro-partial'
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ assets: sampleTrending, source: 'sample' });
  } catch (error) {
    console.error('eToro trending error:', error);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ assets: sampleTrending, source: 'sample' });
  }
}
