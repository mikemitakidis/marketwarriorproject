import { useState, useEffect, useRef } from 'react';
import JournalLayout from '../../components/journal/JournalLayout';
import { getUserFromRequest, getServiceSupabase } from '../../lib/serverAuth';

export default function ChartsPage({ user, settings, recentSymbols }) {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [interval, setInterval] = useState('D');
  const [showWatchlist, setShowWatchlist] = useState(true);
  const chartContainerRef = useRef(null);
  const tickerContainerRef = useRef(null);

  const intervals = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1H' },
    { value: '240', label: '4H' },
    { value: 'D', label: '1D' },
    { value: 'W', label: '1W' },
  ];

  const popularSymbols = [
    { symbol: 'BTCUSD', name: 'Bitcoin' },
    { symbol: 'ETHUSD', name: 'Ethereum' },
    { symbol: 'SPY', name: 'S&P 500' },
    { symbol: 'QQQ', name: 'Nasdaq' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'EURUSD', name: 'EUR/USD' },
    { symbol: 'GBPUSD', name: 'GBP/USD' },
    { symbol: 'XAUUSD', name: 'Gold' },
    { symbol: 'DXY', name: 'Dollar Index' },
  ];

  useEffect(() => {
    // Load TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      createChart();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    if (window.TradingView) {
      createChart();
    }
  }, [symbol, interval]);

  const createChart = () => {
    if (!chartContainerRef.current || !window.TradingView) return;

    chartContainerRef.current.innerHTML = '';

    new window.TradingView.widget({
      container_id: 'tradingview-chart',
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#1e293b',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: true,
      withdateranges: true,
      details: true,
      hotlist: true,
      calendar: true,
      studies: [
        'MACD@tv-basicstudies',
        'RSI@tv-basicstudies',
        'Volume@tv-basicstudies',
      ],
      width: '100%',
      height: 600,
    });
  };

  return (
    <JournalLayout user={user} title="Charts" settings={settings}>
      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        h1 {
          color: white;
          font-size: 1.8rem;
        }
        .controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .symbol-input {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          width: 150px;
          outline: none;
          text-transform: uppercase;
        }
        .symbol-input:focus {
          border-color: #667eea;
        }
        .interval-selector {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          overflow: hidden;
        }
        .interval-btn {
          padding: 10px 14px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
        }
        .interval-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .interval-btn.active {
          background: #667eea;
          color: white;
        }
        .content {
          display: grid;
          grid-template-columns: ${showWatchlist ? '250px 1fr' : '1fr'};
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .content {
            grid-template-columns: 1fr;
          }
        }
        .watchlist {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
        }
        .watchlist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .watchlist-title {
          color: white;
          font-size: 1rem;
          font-weight: 600;
        }
        .watchlist-toggle {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 0.8rem;
        }
        .watchlist-section {
          margin-bottom: 20px;
        }
        .watchlist-section-title {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .symbol-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .symbol-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .symbol-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .symbol-item.active {
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid rgba(102, 126, 234, 0.3);
        }
        .symbol-name {
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .symbol-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
        }
        .chart-container {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        .chart-wrapper {
          min-height: 600px;
        }
        .ticker-tape {
          margin-bottom: 24px;
          overflow: hidden;
          border-radius: 8px;
        }
        .disclaimer {
          margin-top: 24px;
          padding: 16px;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }
        .disclaimer-title {
          color: #fcd34d;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .quick-tools {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .quick-tool {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quick-tool:hover {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
          color: white;
        }
      `}</style>

      <div className="header">
        <h1>TradingView Charts</h1>
        <div className="controls">
          <input
            type="text"
            className="symbol-input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createChart();
              }
            }}
          />
          <div className="interval-selector">
            {intervals.map((i) => (
              <button
                key={i.value}
                className={`interval-btn ${interval === i.value ? 'active' : ''}`}
                onClick={() => setInterval(i.value)}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TradingView Ticker Tape */}
      <div className="ticker-tape">
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <div class="tradingview-widget-container">
                <div class="tradingview-widget-container__widget"></div>
                <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js" async>
                  {
                    "symbols": [
                      {"proName": "BITSTAMP:BTCUSD", "title": "BTC/USD"},
                      {"proName": "BITSTAMP:ETHUSD", "title": "ETH/USD"},
                      {"proName": "FOREXCOM:SPXUSD", "title": "S&P 500"},
                      {"proName": "FOREXCOM:NSXUSD", "title": "Nasdaq"},
                      {"proName": "FX:EURUSD", "title": "EUR/USD"},
                      {"proName": "OANDA:XAUUSD", "title": "Gold"}
                    ],
                    "showSymbolLogo": true,
                    "colorTheme": "dark",
                    "isTransparent": true,
                    "displayMode": "adaptive",
                    "locale": "en"
                  }
                </script>
              </div>
            `,
          }}
        />
      </div>

      <div className="content">
        {showWatchlist && (
          <div className="watchlist">
            <div className="watchlist-header">
              <span className="watchlist-title">Watchlist</span>
            </div>

            {recentSymbols && recentSymbols.length > 0 && (
              <div className="watchlist-section">
                <div className="watchlist-section-title">Your Recent Trades</div>
                <div className="symbol-list">
                  {recentSymbols.map((s) => (
                    <div
                      key={s}
                      className={`symbol-item ${symbol === s ? 'active' : ''}`}
                      onClick={() => setSymbol(s)}
                    >
                      <span className="symbol-name">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="watchlist-section">
              <div className="watchlist-section-title">Popular</div>
              <div className="symbol-list">
                {popularSymbols.map((s) => (
                  <div
                    key={s.symbol}
                    className={`symbol-item ${symbol === s.symbol ? 'active' : ''}`}
                    onClick={() => setSymbol(s.symbol)}
                  >
                    <span className="symbol-name">{s.symbol}</span>
                    <span className="symbol-label">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="quick-tools">
              <span className="quick-tool" onClick={() => setSymbol('BTCUSD')}>BTC</span>
              <span className="quick-tool" onClick={() => setSymbol('ETHUSD')}>ETH</span>
              <span className="quick-tool" onClick={() => setSymbol('SPY')}>SPY</span>
              <span className="quick-tool" onClick={() => setSymbol('EURUSD')}>EUR/USD</span>
              <span className="quick-tool" onClick={() => setSymbol('XAUUSD')}>Gold</span>
            </div>
          </div>
        )}

        <div className="chart-container">
          <div id="tradingview-chart" ref={chartContainerRef} className="chart-wrapper" />
        </div>
      </div>

      <div className="disclaimer">
        <div className="disclaimer-title">⚠️ Disclaimer</div>
        Charts are provided by TradingView and are for informational purposes only.
        This is not financial advice. Always do your own research before making trading decisions.
        Past performance is not indicative of future results.
      </div>
    </JournalLayout>
  );
}

export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const supabase = getServiceSupabase();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('has_paid, full_name')
      .eq('id', user.id)
      .single();

    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get recent traded symbols
    const { data: recentTrades } = await supabase
      .from('journal_trades')
      .select('symbol')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentSymbols = recentTrades
      ? [...new Set(recentTrades.map(t => t.symbol))].slice(0, 5)
      : [];

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.full_name || null,
          isStudent: profile?.has_paid || false,
        },
        settings: settings || null,
        recentSymbols,
      },
    };
  } catch (err) {
    console.error('Charts page error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}
