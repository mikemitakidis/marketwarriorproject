/**
 * GET /api/journal/market-data
 * Fetches REAL live market prices from free APIs
 * - Crypto: CoinGecko (free, no key)
 * - Stocks/ETFs/Indices/Forex/Commodities: Yahoo Finance (free)
 */

// Symbol mappings to Yahoo Finance tickers
const yahooSymbols = {
  // Stocks
  AAPL: 'AAPL', TSLA: 'TSLA', MSFT: 'MSFT', GOOGL: 'GOOGL',
  AMZN: 'AMZN', NVDA: 'NVDA', META: 'META', NFLX: 'NFLX',
  // ETFs
  SPY: 'SPY', QQQ: 'QQQ', IWM: 'IWM', VTI: 'VTI', GLD: 'GLD', ARKK: 'ARKK',
  // Indices
  SPX500: '^GSPC', NSDQ100: '^NDX', DJ30: '^DJI', UK100: '^FTSE', GER40: '^GDAXI', JPN225: '^N225',
  // Commodities
  GOLD: 'GC=F', SILVER: 'SI=F', OIL: 'CL=F', NATGAS: 'NG=F', COPPER: 'HG=F', PLATINUM: 'PL=F',
  // Forex
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X',
  AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', USDCHF: 'USDCHF=X',
};

// CoinGecko IDs for crypto
const cryptoIds = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
  ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', LINK: 'chainlink',
};

async function fetchCryptoPrices() {
  try {
    const ids = Object.values(cryptoIds).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) {
      console.error('CoinGecko error:', res.status);
      return {};
    }

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
    console.error('Crypto fetch error:', err);
    return {};
  }
}

async function fetchYahooPrices(symbols) {
  try {
    const yahooTickers = symbols
      .filter(s => yahooSymbols[s])
      .map(s => yahooSymbols[s]);

    if (yahooTickers.length === 0) return {};

    const tickerStr = yahooTickers.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickerStr}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      console.error('Yahoo Finance error:', res.status);
      return {};
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];
    const prices = {};

    // Reverse map Yahoo symbols back to our symbols
    const reverseMap = {};
    for (const [ourSymbol, yahooSymbol] of Object.entries(yahooSymbols)) {
      reverseMap[yahooSymbol] = ourSymbol;
    }

    for (const quote of quotes) {
      const ourSymbol = reverseMap[quote.symbol];
      if (ourSymbol) {
        prices[ourSymbol] = {
          price: quote.regularMarketPrice || quote.price || 0,
          change: quote.regularMarketChangePercent || 0,
          previousClose: quote.regularMarketPreviousClose || 0,
          marketState: quote.marketState || 'CLOSED',
        };
      }
    }

    return prices;
  } catch (err) {
    console.error('Yahoo fetch error:', err);
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;

    // Define which symbols to fetch based on category
    const categorySymbols = {
      stocks: ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX'],
      crypto: ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'LINK'],
      indices: ['SPX500', 'NSDQ100', 'DJ30', 'UK100', 'GER40', 'JPN225'],
      commodities: ['GOLD', 'SILVER', 'OIL', 'NATGAS', 'COPPER', 'PLATINUM'],
      etfs: ['SPY', 'QQQ', 'IWM', 'VTI', 'GLD', 'ARKK'],
      forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'],
    };

    let prices = {};

    if (category === 'crypto') {
      // Use CoinGecko for crypto
      prices = await fetchCryptoPrices();
    } else if (category && categorySymbols[category]) {
      // Use Yahoo Finance for everything else
      prices = await fetchYahooPrices(categorySymbols[category]);
    } else {
      // Fetch all categories
      const [cryptoPrices, stockPrices, indexPrices, commodityPrices, etfPrices, forexPrices] = await Promise.all([
        fetchCryptoPrices(),
        fetchYahooPrices(categorySymbols.stocks),
        fetchYahooPrices(categorySymbols.indices),
        fetchYahooPrices(categorySymbols.commodities),
        fetchYahooPrices(categorySymbols.etfs),
        fetchYahooPrices(categorySymbols.forex),
      ]);

      prices = {
        ...cryptoPrices,
        ...stockPrices,
        ...indexPrices,
        ...commodityPrices,
        ...etfPrices,
        ...forexPrices,
      };
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ prices, timestamp: Date.now() });
  } catch (err) {
    console.error('Market data error:', err);
    return res.status(500).json({ error: 'Failed to fetch market data', prices: {} });
  }
}
