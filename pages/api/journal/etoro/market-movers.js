/**
 * eToro Market Movers API Proxy
 * GET /api/journal/etoro/market-movers
 *
 * Uses: https://public-api.etoro.com/api/v1/market-data/search
 * Required headers: x-api-key, x-user-key, x-request-id
 *
 * Logic: Fetches instruments and sorts by change percentage to find
 * top gainers and losers
 */

import { v4 as uuidv4 } from 'uuid';

// Sample gainers data (fallback)
const sampleGainers = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', change: 5.67 },
  { symbol: 'AMD', name: 'AMD Inc.', change: 4.23 },
  { symbol: 'COIN', name: 'Coinbase Global', change: 3.89 },
  { symbol: 'PLTR', name: 'Palantir Tech.', change: 3.45 },
  { symbol: 'MARA', name: 'Marathon Digital', change: 3.12 },
];

// Sample losers data (fallback)
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
    // Use /market-data/search endpoint to get instruments
    const response = await fetch('https://public-api.etoro.com/api/v1/market-data/search', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'x-request-id': uuidv4(),
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('eToro market-movers response status:', response.status);
    console.log('eToro market-movers response length:', responseText.length);
    console.log('eToro market-movers response preview:', responseText ? responseText.substring(0, 1000) : '(empty)');

    // Handle empty response
    if (!responseText || responseText.trim() === '') {
      console.error('eToro market-movers returned empty response');
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
      return res.status(200).json({ assets: sampleData, source: 'sample' });
    }

    if (!response.ok) {
      console.error('eToro market-movers API error:', response.status, responseText);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
      return res.status(200).json({ assets: sampleData, source: 'sample' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro market-movers JSON parse error:', parseError);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
      return res.status(200).json({ assets: sampleData, source: 'sample' });
    }

    console.log('eToro market-movers data keys:', Object.keys(data || {}));

    // Log first item structure if available
    if (Array.isArray(data) && data.length > 0) {
      console.log('eToro market-movers first item keys:', Object.keys(data[0]));
    } else if (data && typeof data === 'object') {
      const possibleArrays = ['instruments', 'Instruments', 'items', 'Items', 'results', 'Results', 'data', 'Data'];
      for (const key of possibleArrays) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          console.log(`eToro market-movers ${key}[0] keys:`, Object.keys(data[key][0]));
          break;
        }
      }
    }

    // Extract instruments - handle various response formats
    let instruments = [];
    if (Array.isArray(data)) {
      instruments = data;
    } else if (data && typeof data === 'object') {
      instruments = data.instruments || data.Instruments ||
                   data.items || data.Items ||
                   data.results || data.Results ||
                   data.data || data.Data || [];
    }

    if (Array.isArray(instruments) && instruments.length > 0) {
      // Map to our format - try multiple possible field names
      const mappedInstruments = instruments
        .map(item => {
          // Try to extract change percentage from various possible fields
          const change =
            item.dailyChangePercentage ?? item.DailyChangePercentage ??
            item.percentChange ?? item.PercentChange ??
            item.changePercent ?? item.ChangePercent ??
            item.priceChangePercent ?? item.PriceChangePercent ??
            item.change ?? item.Change ??
            item.pctChange ?? item.PctChange ?? null;

          // Skip items without change data
          if (change === null || change === undefined) return null;

          return {
            symbol: item.symbol || item.Symbol || item.ticker || item.Ticker ||
                   item.symbolFull || item.SymbolFull || item.name || item.Name,
            name: item.instrumentDisplayName || item.InstrumentDisplayName ||
                 item.displayName || item.DisplayName ||
                 item.fullName || item.FullName ||
                 item.name || item.Name || item.symbol || item.Symbol,
            price: item.price || item.Price || item.lastPrice || item.LastPrice ||
                  item.currentPrice || item.CurrentPrice || item.ask || item.Ask,
            change: parseFloat(change) || 0,
          };
        })
        .filter(item => item !== null);

      console.log('eToro market-movers mapped items:', mappedInstruments.length);

      if (mappedInstruments.length > 0) {
        // Sort by change percentage
        const sorted = [...mappedInstruments].sort((a, b) => b.change - a.change);

        // Get top 5 gainers (highest positive change)
        const gainers = sorted.filter(i => i.change > 0).slice(0, 5);

        // Get top 5 losers (most negative change)
        const losers = sorted.filter(i => i.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

        const assets = type === 'losers' ? losers : gainers;

        // If we got real data, return it
        if (assets.length > 0) {
          res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
          return res.status(200).json({ assets, source: 'etoro' });
        }
      }
    }

    // No valid data found, return sample
    console.log('eToro market-movers: No valid change data found, using sample');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  } catch (error) {
    console.error('eToro market-movers error:', error);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ assets: sampleData, source: 'sample' });
  }
}
