/**
 * eToro CopyTraders (People Search) API Proxy
 * GET /api/journal/etoro/copytraders
 *
 * Endpoint: https://public-api.etoro.com/api/v1/user-info/people/search
 * Required headers: x-api-key, x-user-key, x-request-id
 */

import { v4 as uuidv4 } from 'uuid';

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

// Valid period options
const VALID_PERIODS = [
  'CurrMonth', 'CurrQuarter', 'CurrYear', 'LastYear', 'LastTwoYears',
  'OneMonthAgo', 'TwoMonthsAgo', 'ThreeMonthsAgo', 'SixMonthsAgo', 'OneYearAgo'
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ETORO_API_KEY;
  const userKey = process.env.ETORO_USER_KEY;
  const { period = 'CurrYear' } = req.query;
  const validPeriod = VALID_PERIODS.includes(period) ? period : 'CurrYear';

  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
  }

  try {
    const url = `https://public-api.etoro.com/api/v1/user-info/people/search?period=${validPeriod}`;

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
    console.log('eToro copytraders response status:', response.status);
    console.log('eToro copytraders response length:', responseText.length);
    console.log('eToro copytraders response:', responseText ? responseText.substring(0, 500) : '(empty)');

    // Handle empty response
    if (!responseText || responseText.trim() === '') {
      console.error('eToro copytraders returned empty response');
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
      return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
    }

    if (!response.ok) {
      console.error('eToro copytraders API error:', response.status, responseText);
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
      return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro copytraders JSON parse error:', parseError);
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
      return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
    }

    // Log the structure to understand the format
    console.log('eToro copytraders data keys:', Object.keys(data));

    // Try to find the array in various possible locations (camelCase and PascalCase)
    let rawTraders = [];
    if (Array.isArray(data)) {
      rawTraders = data;
    } else if (data && typeof data === 'object') {
      rawTraders = data.users || data.Users || data.people || data.People || data.results || data.Results || data.items || data.Items || data.traders || data.Traders || [];
    }

    if (rawTraders.length > 0) {
      const traders = rawTraders.map(trader => ({
        username: trader.UserName || trader.Username || trader.userName || trader.username,
        name: trader.DisplayName || trader.FullName || trader.Name || trader.displayName || trader.name,
        gain: trader.Gain || trader.YearlyGain || trader.TwelveMonthReturn || trader.Performance || trader.gain || 0,
        copiers: trader.Copiers || trader.CopierCount || trader.NumOfCopiers || trader.copiers || 0,
        riskScore: trader.RiskScore || trader.Risk || trader.riskScore || 0,
      }));

      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
      return res.status(200).json({ traders, source: 'etoro', period: validPeriod });
    }

    // No data found, return sample
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
  } catch (error) {
    console.error('eToro copytraders error:', error);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
  }
}
