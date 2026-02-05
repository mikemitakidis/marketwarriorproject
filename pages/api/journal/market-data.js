/**
 * GET /api/journal/market-data
 * Fetches REAL live market prices from eToro API ONLY
 * Endpoint: https://public-api.etoro.com/api/v1/market-data/instruments/rates
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ETORO_API_KEY;
    const userKey = process.env.ETORO_USER_KEY;

    if (!apiKey || !userKey) {
      console.error('eToro API keys not configured');
      return res.status(500).json({ error: 'API keys not configured', prices: {} });
    }

    // Fetch rates from eToro
    const url = 'https://public-api.etoro.com/api/v1/market-data/instruments/rates';

    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'x-request-id': `rates-${Date.now()}`,
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('eToro rates status:', response.status);
    console.log('eToro rates response:', responseText.substring(0, 1000));

    if (!response.ok) {
      console.error('eToro rates error:', response.status);
      return res.status(response.status).json({ error: 'eToro API error', prices: {} });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      return res.status(500).json({ error: 'Invalid response', prices: {} });
    }

    console.log('eToro data keys:', Object.keys(data || {}));

    // Process rates - handle different response formats
    const rates = data.rates || data.Rates || (Array.isArray(data) ? data : []);

    if (rates.length > 0) {
      console.log('First rate object keys:', Object.keys(rates[0]));
      console.log('First rate sample:', JSON.stringify(rates[0]).substring(0, 300));
    }

    const prices = {};

    for (const rate of rates) {
      // Get symbol/ticker from the rate object
      const symbol = rate.symbolFull || rate.SymbolFull || rate.symbol || rate.Symbol ||
                     rate.ticker || rate.Ticker || rate.instrumentDisplayName || rate.InstrumentDisplayName;

      if (!symbol) continue;

      // Get price data
      const bid = rate.bid || rate.Bid || 0;
      const ask = rate.ask || rate.Ask || 0;
      const price = (bid && ask) ? (bid + ask) / 2 : (rate.lastPrice || rate.LastPrice || rate.price || rate.Price || 0);
      const change = rate.changePercent || rate.ChangePercent || rate.dailyChangePercent ||
                     rate.DailyChangePercent || rate.change || rate.Change || 0;

      prices[symbol] = {
        price,
        change,
        bid,
        ask,
        instrumentId: rate.instrumentId || rate.InstrumentId,
      };
    }

    console.log('Processed prices count:', Object.keys(prices).length);
    console.log('Sample symbols:', Object.keys(prices).slice(0, 10));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({
      prices,
      timestamp: Date.now(),
      count: Object.keys(prices).length,
    });

  } catch (err) {
    console.error('Market data error:', err);
    return res.status(500).json({ error: err.message, prices: {} });
  }
}
