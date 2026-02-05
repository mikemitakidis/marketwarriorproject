/**
 * GET /api/journal/market-data
 * Fetches REAL live market prices from eToro API
 * Endpoint: https://public-api.etoro.com/api/v1/market-data/instruments/rates
 */

// eToro instrument IDs mapping (these are eToro's internal IDs)
const instrumentIds = {
  // Stocks
  AAPL: 1001, TSLA: 1032, MSFT: 1002, GOOGL: 1005,
  AMZN: 1004, NVDA: 1033, META: 1007, NFLX: 1012,
  // Crypto
  BTC: 100000, ETH: 100001, XRP: 100002, SOL: 100010,
  ADA: 100004, DOGE: 100006, DOT: 100007, LINK: 100005,
  // Indices
  SPX500: 10001, NSDQ100: 10002, DJ30: 10003, UK100: 10004, GER40: 10005, JPN225: 10006,
  // Commodities
  GOLD: 5001, SILVER: 5002, OIL: 5003, NATGAS: 5004, COPPER: 5005, PLATINUM: 5006,
  // ETFs
  SPY: 1100, QQQ: 1101, IWM: 1102, VTI: 1103, GLD: 1104, ARKK: 1105,
  // Forex
  EURUSD: 1, GBPUSD: 2, USDJPY: 3, AUDUSD: 4, USDCAD: 5, USDCHF: 6,
};

// Category to symbols mapping
const categorySymbols = {
  stocks: ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX'],
  crypto: ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'LINK'],
  indices: ['SPX500', 'NSDQ100', 'DJ30', 'UK100', 'GER40', 'JPN225'],
  commodities: ['GOLD', 'SILVER', 'OIL', 'NATGAS', 'COPPER', 'PLATINUM'],
  etfs: ['SPY', 'QQQ', 'IWM', 'VTI', 'GLD', 'ARKK'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'],
};

async function fetchEtoroRates(symbols) {
  try {
    const apiKey = process.env.ETORO_API_KEY;
    const userKey = process.env.ETORO_USER_KEY;

    if (!apiKey || !userKey) {
      console.error('eToro API keys not configured');
      return {};
    }

    // Get instrument IDs for the requested symbols
    const ids = symbols.map(s => instrumentIds[s]).filter(Boolean);
    if (ids.length === 0) return {};

    const url = `https://public-api.etoro.com/api/v1/market-data/instruments/rates?instrumentIds=${ids.join(',')}`;

    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'x-user-key': userKey,
        'x-request-id': `market-data-${Date.now()}`,
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('eToro rates response status:', response.status);
    console.log('eToro rates response:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('eToro rates API error:', response.status, responseText);
      return {};
    }

    if (!responseText) {
      console.error('eToro rates returned empty response');
      return {};
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('eToro rates JSON parse error:', parseError);
      return {};
    }

    // Process the rates data
    const rates = data.rates || data.Rates || data;
    console.log('eToro rates data keys:', Object.keys(data || {}));

    if (!Array.isArray(rates)) {
      console.error('eToro rates is not an array:', typeof rates);
      return {};
    }

    // Create reverse mapping from instrumentId to symbol
    const idToSymbol = {};
    for (const [symbol, id] of Object.entries(instrumentIds)) {
      idToSymbol[id] = symbol;
    }

    const prices = {};
    for (const rate of rates) {
      const id = rate.instrumentId || rate.InstrumentId;
      const symbol = idToSymbol[id];

      if (symbol) {
        // Get the price and change
        const bid = rate.bid || rate.Bid || 0;
        const ask = rate.ask || rate.Ask || 0;
        const price = (bid + ask) / 2 || rate.price || rate.Price || 0;
        const change = rate.changePercent || rate.ChangePercent || rate.dailyChange || rate.DailyChange || 0;

        prices[symbol] = {
          price,
          change,
          bid,
          ask,
        };
      }
    }

    return prices;
  } catch (err) {
    console.error('eToro rates fetch error:', err);
    return {};
  }
}

// Fallback to CoinGecko for crypto if eToro fails
async function fetchCryptoPricesFallback() {
  try {
    const cryptoIds = {
      BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
      ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', LINK: 'chainlink',
    };

    const ids = Object.values(cryptoIds).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) return {};

    const data = await res.json();
    const prices = {};

    for (const [symbol, id] of Object.entries(cryptoIds)) {
      if (data[id]) {
        prices[symbol] = {
          price: data[id].usd,
          change: data[id].usd_24h_change || 0,
        };
      }
    }

    return prices;
  } catch (err) {
    console.error('CoinGecko fallback error:', err);
    return {};
  }
}

// Fallback to Yahoo Finance for stocks/etfs if eToro fails
async function fetchYahooPricesFallback(symbols) {
  try {
    const yahooSymbols = {
      AAPL: 'AAPL', TSLA: 'TSLA', MSFT: 'MSFT', GOOGL: 'GOOGL',
      AMZN: 'AMZN', NVDA: 'NVDA', META: 'META', NFLX: 'NFLX',
      SPY: 'SPY', QQQ: 'QQQ', IWM: 'IWM', VTI: 'VTI', GLD: 'GLD', ARKK: 'ARKK',
      SPX500: '^GSPC', NSDQ100: '^NDX', DJ30: '^DJI', UK100: '^FTSE', GER40: '^GDAXI', JPN225: '^N225',
      GOLD: 'GC=F', SILVER: 'SI=F', OIL: 'CL=F', NATGAS: 'NG=F', COPPER: 'HG=F', PLATINUM: 'PL=F',
      EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X',
      AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', USDCHF: 'USDCHF=X',
    };

    const yahooTickers = symbols.filter(s => yahooSymbols[s]).map(s => yahooSymbols[s]);
    if (yahooTickers.length === 0) return {};

    const tickerStr = yahooTickers.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickerStr}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!res.ok) return {};

    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];
    const prices = {};

    const reverseMap = {};
    for (const [ourSymbol, yahooSymbol] of Object.entries(yahooSymbols)) {
      reverseMap[yahooSymbol] = ourSymbol;
    }

    for (const quote of quotes) {
      const ourSymbol = reverseMap[quote.symbol];
      if (ourSymbol) {
        prices[ourSymbol] = {
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChangePercent || 0,
        };
      }
    }

    return prices;
  } catch (err) {
    console.error('Yahoo fallback error:', err);
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;
    const symbols = category && categorySymbols[category]
      ? categorySymbols[category]
      : Object.values(categorySymbols).flat();

    // Try eToro API first
    let prices = await fetchEtoroRates(symbols);

    // If eToro returns empty, use fallbacks
    if (Object.keys(prices).length === 0) {
      console.log('eToro returned no prices, using fallbacks...');

      if (category === 'crypto') {
        prices = await fetchCryptoPricesFallback();
      } else {
        prices = await fetchYahooPricesFallback(symbols);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({
      prices,
      timestamp: Date.now(),
      source: Object.keys(prices).length > 0 ? 'live' : 'unavailable'
    });
  } catch (err) {
    console.error('Market data error:', err);
    return res.status(500).json({ error: 'Failed to fetch market data', prices: {} });
  }
}
