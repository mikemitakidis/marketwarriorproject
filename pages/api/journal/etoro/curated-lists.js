/**
 * eToro Curated Watchlists API Proxy
 * GET /api/journal/etoro/curated-lists
 *
 * Endpoint: https://public-api.etoro.com/api/v1/curated-lists
 * Returns expert-selected thematic watchlists like "Big Tech", "Renewable Energy", etc.
 */

import { v4 as uuidv4 } from 'uuid';

const sampleCuratedLists = [
  { id: 1, name: 'Big Tech', description: 'Leading technology companies driving innovation worldwide', instrumentCount: 12, category: 'Technology' },
  { id: 2, name: 'Renewable Energy', description: 'Companies focused on solar, wind, and clean energy solutions', instrumentCount: 15, category: 'Energy' },
  { id: 3, name: 'Crypto Giants', description: 'The largest and most established cryptocurrencies by market cap', instrumentCount: 10, category: 'Crypto' },
  { id: 4, name: 'Healthcare Innovation', description: 'Biotech and pharmaceutical companies advancing medical breakthroughs', instrumentCount: 14, category: 'Healthcare' },
  { id: 5, name: 'E-Commerce Leaders', description: 'Top online retail and marketplace platforms globally', instrumentCount: 8, category: 'Consumer' },
  { id: 6, name: 'Dividend Aristocrats', description: 'Companies with 25+ years of consecutive dividend increases', instrumentCount: 20, category: 'Income' },
  { id: 7, name: 'AI & Robotics', description: 'Companies at the forefront of artificial intelligence and automation', instrumentCount: 11, category: 'Technology' },
  { id: 8, name: 'Gaming & Esports', description: 'Video game publishers, hardware makers, and esports companies', instrumentCount: 9, category: 'Entertainment' },
  { id: 9, name: 'Fintech Revolution', description: 'Financial technology disruptors changing banking and payments', instrumentCount: 13, category: 'Finance' },
  { id: 10, name: 'Electric Vehicles', description: 'EV manufacturers, battery makers, and charging infrastructure', instrumentCount: 10, category: 'Automotive' },
  { id: 11, name: 'Gold & Precious Metals', description: 'Gold miners, silver producers, and precious metal ETFs', instrumentCount: 7, category: 'Commodities' },
  { id: 12, name: 'Emerging Markets', description: 'High-growth companies from developing economies', instrumentCount: 16, category: 'Global' },
  { id: 13, name: 'Cybersecurity', description: 'Companies protecting data, networks, and digital infrastructure', instrumentCount: 10, category: 'Technology' },
  { id: 14, name: 'Space Economy', description: 'Satellite companies, rocket makers, and space exploration firms', instrumentCount: 6, category: 'Aerospace' },
  { id: 15, name: 'Cannabis Stocks', description: 'Marijuana growers, distributors, and cannabis-related businesses', instrumentCount: 8, category: 'Healthcare' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;

  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({
      lists: sampleCuratedLists,
      source: 'sample',
      count: sampleCuratedLists.length,
    });
  }

  try {
    const url = 'https://public-api.etoro.com/api/v1/curated-lists';

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
    console.log('eToro curated-lists status:', response.status);
    console.log('eToro curated-lists response:', responseText ? responseText.substring(0, 500) : '(empty)');

    if (!responseText || responseText.trim() === '') {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({ lists: sampleCuratedLists, source: 'sample', count: sampleCuratedLists.length });
    }

    if (!response.ok) {
      console.error('eToro curated-lists API error:', response.status, responseText);
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({ lists: sampleCuratedLists, source: 'sample', count: sampleCuratedLists.length });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro curated-lists JSON parse error:', parseError);
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({ lists: sampleCuratedLists, source: 'sample', count: sampleCuratedLists.length });
    }

    let rawLists = [];
    if (Array.isArray(data)) {
      rawLists = data;
    } else if (data && typeof data === 'object') {
      rawLists = data.lists || data.Lists ||
                 data.items || data.Items ||
                 data.results || data.Results ||
                 data.curatedLists || data.CuratedLists || [];
    }

    if (rawLists.length > 0) {
      const lists = rawLists.map(list => ({
        id: list.id || list.Id || list.listId || list.ListId,
        name: list.name || list.Name || list.displayName || list.DisplayName || list.title || list.Title || '',
        description: list.description || list.Description || list.summary || list.Summary || '',
        instrumentCount: list.instrumentCount || list.InstrumentCount || list.count || list.Count ||
                         list.numOfInstruments || list.NumOfInstruments || 0,
        category: list.category || list.Category || list.type || list.Type || 'General',
        imageUrl: list.imageUrl || list.ImageUrl || list.image || list.Image || null,
      })).filter(l => l.name);

      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      return res.status(200).json({
        lists,
        source: 'etoro',
        count: lists.length,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ lists: sampleCuratedLists, source: 'sample', count: sampleCuratedLists.length });
  } catch (error) {
    console.error('eToro curated-lists error:', error);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ lists: sampleCuratedLists, source: 'sample', count: sampleCuratedLists.length });
  }
}
