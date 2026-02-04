import { useState, useEffect, useRef } from 'react';
import JournalLayout from '../../components/journal/JournalLayout';
import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';

export default function ChartsPage({ user, settings, recentSymbols }) {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [interval, setInterval] = useState('D');
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [activeTab, setActiveTab] = useState('chart'); // chart, calendar, screener
  const chartContainerRef = useRef(null);
  const tickerContainerRef = useRef(null);
  const symbolInfoRef = useRef(null);

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
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .tab {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        .tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .tab.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border-color: rgba(102, 126, 234, 0.5);
          color: #667eea;
        }
        .widgets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }
        .widget-container {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        .widget-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 600;
        }
        .widget-content {
          min-height: 400px;
        }
        .symbol-info-widget {
          min-height: 150px;
        }
        .calendar-widget {
          min-height: 500px;
        }
        .screener-widget {
          min-height: 450px;
        }
        .hotlist-widget {
          min-height: 350px;
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

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          Chart
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Economic Calendar
        </button>
        <button
          className={`tab ${activeTab === 'screener' ? 'active' : ''}`}
          onClick={() => setActiveTab('screener')}
        >
          Market Screener
        </button>
        <button
          className={`tab ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          Heatmap
        </button>
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

      {/* Chart Tab Content */}
      {activeTab === 'chart' && (
        <>
          {/* Symbol Info Widget */}
          <div className="widget-container" style={{ marginBottom: '24px' }}>
            <div className="widget-content symbol-info-widget">
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                    <div class="tradingview-widget-container">
                      <iframe
                        scrolling="no"
                        allowtransparency="true"
                        frameborder="0"
                        src="https://s.tradingview.com/embed-widget/symbol-info/?locale=en#%7B%22symbol%22%3A%22${symbol}%22%2C%22width%22%3A%22100%25%22%2C%22isTransparent%22%3Atrue%2C%22colorTheme%22%3A%22dark%22%7D"
                        style="width: 100%; height: 150px;"
                      ></iframe>
                    </div>
                  `,
                }}
                key={symbol}
              />
            </div>
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

                {/* Mini Hotlist Widget */}
                <div style={{ marginTop: '20px' }}>
                  <div className="watchlist-section-title">Top Movers</div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: `
                        <div class="tradingview-widget-container">
                          <iframe
                            scrolling="no"
                            allowtransparency="true"
                            frameborder="0"
                            src="https://s.tradingview.com/embed-widget/hotlists/?locale=en#%7B%22colorTheme%22%3A%22dark%22%2C%22dateRange%22%3A%221D%22%2C%22exchange%22%3A%22US%22%2C%22showChart%22%3Afalse%2C%22largeChartUrl%22%3A%22%22%2C%22isTransparent%22%3Atrue%2C%22showSymbolLogo%22%3Afalse%2C%22showFloatingTooltip%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22250%22%7D"
                            style="width: 100%; height: 250px;"
                          ></iframe>
                        </div>
                      `,
                    }}
                  />
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
        </>
      )}

      {/* Economic Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="widget-container">
          <div className="widget-header">Economic Calendar</div>
          <div className="widget-content calendar-widget">
            <div
              dangerouslySetInnerHTML={{
                __html: `
                  <div class="tradingview-widget-container" style="height:100%;width:100%">
                    <iframe
                      scrolling="no"
                      allowtransparency="true"
                      frameborder="0"
                      src="https://s.tradingview.com/embed-widget/events/?locale=en#%7B%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22importanceFilter%22%3A%22-1%2C0%2C1%22%2C%22currencyFilter%22%3A%22USD%2CEUR%2CGBP%2CJPY%2CCAD%2CAUD%2CNZD%2CCHF%22%7D"
                      style="width: 100%; height: 500px;"
                    ></iframe>
                  </div>
                `,
              }}
            />
          </div>
        </div>
      )}

      {/* Screener Tab */}
      {activeTab === 'screener' && (
        <div className="widgets-grid">
          <div className="widget-container">
            <div className="widget-header">Forex Screener</div>
            <div className="widget-content screener-widget">
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                    <div class="tradingview-widget-container" style="height:100%;width:100%">
                      <iframe
                        scrolling="no"
                        allowtransparency="true"
                        frameborder="0"
                        src="https://s.tradingview.com/embed-widget/screener/?locale=en#%7B%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22defaultColumn%22%3A%22overview%22%2C%22defaultScreen%22%3A%22general%22%2C%22market%22%3A%22forex%22%2C%22showToolbar%22%3Atrue%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%7D"
                        style="width: 100%; height: 450px;"
                      ></iframe>
                    </div>
                  `,
                }}
              />
            </div>
          </div>
          <div className="widget-container">
            <div className="widget-header">Crypto Screener</div>
            <div className="widget-content screener-widget">
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                    <div class="tradingview-widget-container" style="height:100%;width:100%">
                      <iframe
                        scrolling="no"
                        allowtransparency="true"
                        frameborder="0"
                        src="https://s.tradingview.com/embed-widget/screener/?locale=en#%7B%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22defaultColumn%22%3A%22overview%22%2C%22defaultScreen%22%3A%22general%22%2C%22market%22%3A%22crypto%22%2C%22showToolbar%22%3Atrue%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%7D"
                        style="width: 100%; height: 450px;"
                      ></iframe>
                    </div>
                  `,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Tab */}
      {activeTab === 'heatmap' && (
        <div className="widgets-grid">
          <div className="widget-container">
            <div className="widget-header">Stock Market Heatmap</div>
            <div className="widget-content" style={{ minHeight: '500px' }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                    <div class="tradingview-widget-container" style="height:100%;width:100%">
                      <iframe
                        scrolling="no"
                        allowtransparency="true"
                        frameborder="0"
                        src="https://s.tradingview.com/embed-widget/stock-heatmap/?locale=en#%7B%22exchanges%22%3A%5B%5D%2C%22dataSource%22%3A%22SPX500%22%2C%22grouping%22%3A%22sector%22%2C%22blockSize%22%3A%22market_cap_basic%22%2C%22blockColor%22%3A%22change%22%2C%22hasTopBar%22%3Atrue%2C%22isDataSetEnabled%22%3Atrue%2C%22isZoomEnabled%22%3Atrue%2C%22hasSymbolTooltip%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%7D"
                        style="width: 100%; height: 500px;"
                      ></iframe>
                    </div>
                  `,
                }}
              />
            </div>
          </div>
          <div className="widget-container">
            <div className="widget-header">Crypto Heatmap</div>
            <div className="widget-content" style={{ minHeight: '500px' }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                    <div class="tradingview-widget-container" style="height:100%;width:100%">
                      <iframe
                        scrolling="no"
                        allowtransparency="true"
                        frameborder="0"
                        src="https://s.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=en#%7B%22dataSource%22%3A%22Crypto%22%2C%22blockSize%22%3A%22market_cap_calc%22%2C%22blockColor%22%3A%22change%22%2C%22hasTopBar%22%3Atrue%2C%22isDataSetEnabled%22%3Atrue%2C%22isZoomEnabled%22%3Atrue%2C%22hasSymbolTooltip%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%7D"
                        style="width: 100%; height: 500px;"
                      ></iframe>
                    </div>
                  `,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="disclaimer">
        <div className="disclaimer-title">Disclaimer</div>
        Charts and market data are provided by TradingView and are for informational purposes only.
        This is not financial advice. Always do your own research before making trading decisions.
        Past performance is not indicative of future results.
      </div>
    </JournalLayout>
  );
}

export async function getServerSideProps({ req, res }) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    const access = await checkJournalAccess(user);
    if (!access.hasAccess && access.requiresPayment) {
      return { redirect: { destination: '/trading-journal/upgrade', permanent: false } };
    }

    const supabase = getServiceSupabase();

    const { data: settings } = await supabase
      .from('journal_settings')
      .select('*')
      .eq('journal_user_id', user.id)
      .maybeSingle();

    // Get recent traded symbols
    const { data: recentTrades } = await supabase
      .from('journal_trades')
      .select('symbol')
      .eq('journal_user_id', user.id)
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
          fullName: user.fullName || null,
        },
        settings: settings || null,
        recentSymbols,
      },
    };
  } catch (err) {
    console.error('Charts page error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}
