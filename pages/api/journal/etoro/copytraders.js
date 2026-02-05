/**
 * eToro CopyTraders (People Search) API Proxy
 * GET /api/journal/etoro/copytraders
 *
 * Endpoint: https://public-api.etoro.com/api/v1/user-info/people/search
 * Required headers: x-api-key, x-user-key, x-request-id
 *
 * Query params:
 *   - period: CurrMonth, CurrQuarter, CurrYear, LastYear, LastTwoYears,
 *             OneMonthAgo, TwoMonthsAgo, ThreeMonthsAgo, SixMonthsAgo, OneYearAgo
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

  // Get filter parameters from query
  const { period = 'CurrYear' } = req.query;

  // Validate period
  const validPeriod = VALID_PERIODS.includes(period) ? period : 'CurrYear';

  // If API keys are not configured, return sample data
  if (!apiKey || !userKey) {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
  }

  try {
    // Build URL with query parameters
    const url = new URL('https://public-api.etoro.com/api/v1/user-info/people/search');
    url.searchParams.append('period', validPeriod);

    const response = await fetch(url.toString(), {
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

      // Transform eToro response format
      const rawTraders = data.Users || data.People || data.Results || data || [];
      const traders = rawTraders.map(trader => ({
        username: trader.UserName || trader.Username || trader.userName,
        name: trader.DisplayName || trader.FullName || trader.Name || trader.displayName,
        gain: trader.Gain || trader.YearlyGain || trader.TwelveMonthReturn || trader.Performance || 0,
        copiers: trader.Copiers || trader.CopierCount || trader.NumOfCopiers || 0,
        riskScore: trader.RiskScore || trader.Risk || trader.riskScore || 0,
        avatarUrl: trader.AvatarUrl || trader.Avatar || null,
      }));

      if (traders.length > 0) {
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
        return res.status(200).json({ traders, source: 'etoro', period: validPeriod });
      }
    }

    // Log error for debugging
    const errorText = await response.text();
    console.error('eToro copytraders API error:', response.status, errorText);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
  } catch (error) {
    console.error('eToro copytraders error:', error);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return res.status(200).json({ traders: sampleCopyTraders, source: 'sample', period: validPeriod });
  }
}
