import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';

// Popular instruments by asset category - curated list of tradable assets on eToro
const assetCategories = {
  stocks: {
    name: 'Stocks',
    description: 'Trade shares of top global companies',
    icon: '📈',
    items: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      { symbol: 'META', name: 'Meta Platforms' },
      { symbol: 'NFLX', name: 'Netflix Inc.' },
    ],
  },
  crypto: {
    name: 'Crypto',
    description: 'Trade leading cryptocurrencies',
    icon: '₿',
    items: [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'XRP', name: 'Ripple' },
      { symbol: 'SOL', name: 'Solana' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'DOGE', name: 'Dogecoin' },
      { symbol: 'DOT', name: 'Polkadot' },
      { symbol: 'LINK', name: 'Chainlink' },
    ],
  },
  indices: {
    name: 'Indices',
    description: 'Trade major market indices',
    icon: '📊',
    items: [
      { symbol: 'SPX500', name: 'S&P 500' },
      { symbol: 'NSDQ100', name: 'Nasdaq 100' },
      { symbol: 'DJ30', name: 'Dow Jones 30' },
      { symbol: 'UK100', name: 'FTSE 100' },
      { symbol: 'GER40', name: 'DAX 40' },
      { symbol: 'JPN225', name: 'Nikkei 225' },
    ],
  },
  commodities: {
    name: 'Commodities',
    description: 'Trade gold, oil, and more',
    icon: '🛢️',
    items: [
      { symbol: 'GOLD', name: 'Gold' },
      { symbol: 'SILVER', name: 'Silver' },
      { symbol: 'OIL', name: 'Crude Oil' },
      { symbol: 'NATGAS', name: 'Natural Gas' },
      { symbol: 'COPPER', name: 'Copper' },
      { symbol: 'PLATINUM', name: 'Platinum' },
    ],
  },
  etfs: {
    name: 'ETFs',
    description: 'Trade exchange-traded funds',
    icon: '📦',
    items: [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
      { symbol: 'IWM', name: 'iShares Russell 2000' },
      { symbol: 'VTI', name: 'Vanguard Total Stock' },
      { symbol: 'GLD', name: 'SPDR Gold Shares' },
      { symbol: 'ARKK', name: 'ARK Innovation ETF' },
    ],
  },
  forex: {
    name: 'Forex',
    description: 'Trade major currency pairs',
    icon: '💱',
    items: [
      { symbol: 'EURUSD', name: 'EUR/USD' },
      { symbol: 'GBPUSD', name: 'GBP/USD' },
      { symbol: 'USDJPY', name: 'USD/JPY' },
      { symbol: 'AUDUSD', name: 'AUD/USD' },
      { symbol: 'USDCAD', name: 'USD/CAD' },
      { symbol: 'USDCHF', name: 'USD/CHF' },
    ],
  },
};

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

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
        settings: settings || null,
      },
    };
  } catch (err) {
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

export default function WidgetsPage({ user, settings }) {
  const [activeTab, setActiveTab] = useState('etoro');
  const [copytraders, setCopytraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copytradersLoading, setCopytradersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('CurrYear');
  const [riskFilter, setRiskFilter] = useState('all'); // all, low, medium, high
  const [sortBy, setSortBy] = useState('gain'); // gain, copiers, risk
  const [selectedCategory, setSelectedCategory] = useState('stocks');
  const [marketPrices, setMarketPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // Period options for CopyTraders filter - grouped for better UX
  const periodGroups = {
    current: [
      { value: 'CurrMonth', label: 'This Month' },
      { value: 'CurrQuarter', label: 'This Quarter' },
      { value: 'CurrYear', label: 'This Year' },
    ],
    historical: [
      { value: 'LastYear', label: 'Last Year' },
      { value: 'LastTwoYears', label: '2 Years' },
    ],
  };

  // Risk filter options
  const riskOptions = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'low', label: 'Low (1-3)', min: 1, max: 3 },
    { value: 'medium', label: 'Medium (4-6)', min: 4, max: 6 },
    { value: 'high', label: 'High (7-10)', min: 7, max: 10 },
  ];

  // Sort options
  const sortOptions = [
    { value: 'gain', label: 'Highest Gain' },
    { value: 'copiers', label: 'Most Copiers' },
    { value: 'risk', label: 'Lowest Risk' },
  ];

  useEffect(() => {
    if (activeTab === 'etoro') {
      fetchMarketPrices(selectedCategory);
    } else if (activeTab === 'copytraders') {
      fetchCopytraders(selectedPeriod);
    }
  }, [activeTab]);

  // Fetch prices when category changes
  useEffect(() => {
    if (activeTab === 'etoro') {
      fetchMarketPrices(selectedCategory);
    }
  }, [selectedCategory]);

  // Fetch REAL market prices
  const fetchMarketPrices = async (category) => {
    setPricesLoading(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/market-data?category=${category}`);
      if (res.ok) {
        const data = await res.json();
        setMarketPrices(prev => ({ ...prev, ...data.prices }));
      }
    } catch (err) {
      console.error('Error fetching market prices:', err);
    } finally {
      setPricesLoading(false);
      setLoading(false);
    }
  };

  // Format price based on asset type
  const formatPrice = (price, symbol) => {
    if (!price && price !== 0) return '---';

    // Forex pairs need more decimals
    if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'].includes(symbol)) {
      return price.toFixed(4);
    }
    // Crypto can have varying decimals
    if (['BTC', 'ETH'].includes(symbol)) {
      return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (['XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'SOL'].includes(symbol)) {
      return '$' + price.toFixed(4);
    }
    // Commodities
    if (['GOLD', 'SILVER', 'OIL', 'NATGAS', 'COPPER', 'PLATINUM'].includes(symbol)) {
      return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // Indices (no dollar sign)
    if (['SPX500', 'NSDQ100', 'DJ30', 'UK100', 'GER40', 'JPN225'].includes(symbol)) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // Default for stocks/ETFs
    return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };


  const fetchCopytraders = async (period) => {
    setCopytradersLoading(true);
    try {
      const res = await fetch(`/api/journal/etoro/copytraders?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setCopytraders(data.traders || []);
      }
    } catch (err) {
      console.error('Error fetching copytraders:', err);
    } finally {
      setCopytradersLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    fetchCopytraders(newPeriod);
  };

  // Filter and sort copytraders based on current filters
  const getFilteredTraders = () => {
    let filtered = [...copytraders];

    // Apply risk filter
    if (riskFilter !== 'all') {
      const riskOption = riskOptions.find(r => r.value === riskFilter);
      if (riskOption && riskOption.min !== undefined) {
        filtered = filtered.filter(t =>
          t.riskScore >= riskOption.min && t.riskScore <= riskOption.max
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'gain':
          return (b.gain || 0) - (a.gain || 0);
        case 'copiers':
          return (b.copiers || 0) - (a.copiers || 0);
        case 'risk':
          return (a.riskScore || 0) - (b.riskScore || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleTradeClick = (symbol) => {
    window.open(`/go/etoro-${symbol}`, '_blank', 'noopener,noreferrer');
  };

  const handleEtoroClick = () => {
    window.open('/go/etoro', '_blank', 'noopener,noreferrer');
  };

  const handleCopyTraderClick = (username) => {
    window.open(`/go/etoro-trader-${username}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <JournalLayout user={user} title="Widgets" settings={settings}>
      <style jsx>{`
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }
        .page-desc {
          color: rgba(255, 255, 255, 0.6);
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .tab {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .tab:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .tab.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border-color: rgba(102, 126, 234, 0.5);
          color: #667eea;
        }
        .section {
          margin-bottom: 32px;
        }
        .section-title {
          color: white;
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          font-weight: 400;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .asset-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .asset-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(102, 126, 234, 0.3);
          transform: translateY(-2px);
        }
        .asset-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .asset-symbol {
          color: white;
          font-weight: 600;
          font-size: 1rem;
        }
        .asset-name {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
        }
        .asset-change {
          font-weight: 600;
          font-size: 0.9rem;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .asset-change.positive {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
        }
        .asset-change.negative {
          color: #f87171;
          background: rgba(248, 113, 113, 0.1);
        }
        .asset-price {
          color: white;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .trade-btn {
          margin-top: 12px;
          width: 100%;
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .trade-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .list-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }
        .list-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .list-name {
          color: white;
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 8px;
        }
        .list-desc {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .list-count {
          color: #667eea;
          font-size: 0.8rem;
          margin-top: 12px;
        }
        .trader-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .trader-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(102, 126, 234, 0.3);
        }
        .trader-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .trader-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }
        .trader-name {
          color: white;
          font-weight: 600;
        }
        .trader-username {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
        }
        .trader-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .trader-stat {
          text-align: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
        }
        .trader-stat-value {
          color: #4ade80;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .trader-stat-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 20px;
          color: #f87171;
          text-align: center;
        }
        .disclaimer {
          margin-top: 32px;
          padding: 20px;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 12px;
        }
        .disclaimer-title {
          color: #fcd34d;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .disclaimer-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          line-height: 1.6;
        }
        .disclaimer-text a {
          color: #667eea;
          text-decoration: none;
        }
        .disclaimer-text a:hover {
          text-decoration: underline;
        }
        .etoro-banner {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .banner-content h2 {
          color: white;
          font-size: 1.3rem;
          margin-bottom: 4px;
        }
        .banner-content p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
        .banner-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .banner-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
        .two-columns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        @media (max-width: 768px) {
          .two-columns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Trading Widgets</h1>
        <p className="page-desc">Market data and trading tools powered by eToro</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'etoro' ? 'active' : ''}`}
          onClick={() => setActiveTab('etoro')}
        >
          eToro Markets
        </button>
        <button
          className={`tab ${activeTab === 'copytraders' ? 'active' : ''}`}
          onClick={() => setActiveTab('copytraders')}
        >
          CopyTraders
        </button>
      </div>

      {activeTab === 'etoro' && (
        <>
          <div className="etoro-banner">
            <div className="banner-content">
              <h2>Trade with eToro</h2>
              <p>Access global markets with commission-free trading</p>
            </div>
            <button className="banner-btn" onClick={handleEtoroClick}>
              Open eToro Account
            </button>
          </div>

          {/* Asset Categories */}
          <div className="section">
            <h2 className="section-title">
              Live Markets
              <span className="section-subtitle">Real-time prices • Click to trade on eToro</span>
            </h2>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {Object.entries(assetCategories).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  style={{
                    padding: '10px 18px',
                    background: selectedCategory === key
                      ? 'linear-gradient(135deg, #667eea, #764ba2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: selectedCategory === key
                      ? 'none'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: selectedCategory === key ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Selected Category Content */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600', marginBottom: '4px' }}>
                  {assetCategories[selectedCategory].icon} {assetCategories[selectedCategory].name}
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
                  {assetCategories[selectedCategory].description}
                </p>
              </div>

              {pricesLoading ? (
                <div className="loading">
                  <div className="loading-spinner" />
                  <p>Loading live prices...</p>
                </div>
              ) : (
                <div className="card-grid">
                  {assetCategories[selectedCategory].items.map((item) => {
                    const priceData = marketPrices[item.symbol];
                    const price = priceData?.price;
                    const change = priceData?.change;
                    const isPositive = change >= 0;

                    return (
                      <div
                        key={item.symbol}
                        className="asset-card"
                        onClick={() => handleTradeClick(item.symbol)}
                      >
                        <div className="asset-header">
                          <div>
                            <div className="asset-symbol">{item.symbol}</div>
                            <div className="asset-name">{item.name}</div>
                          </div>
                          {change !== undefined && (
                            <div className={`asset-change ${isPositive ? 'positive' : 'negative'}`}>
                              {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </div>
                          )}
                        </div>
                        {price !== undefined && (
                          <div className="asset-price">{formatPrice(price, item.symbol)}</div>
                        )}
                        <button className="trade-btn" onClick={(e) => { e.stopPropagation(); handleTradeClick(item.symbol); }}>
                          Trade on eToro
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={handleEtoroClick}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  View All {assetCategories[selectedCategory].name} on eToro →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'copytraders' && (
        <>
          <div className="etoro-banner">
            <div className="banner-content">
              <h2>Investor Discovery</h2>
              <p>Find and copy top traders based on your own filters</p>
            </div>
            <button className="banner-btn" onClick={() => window.open('/go/etoro-copytrader', '_blank', 'noopener,noreferrer')}>
              Explore CopyTrader
            </button>
          </div>

          {/* Enhanced Filter System */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            {/* Time Period Filter */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Performance Period
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {periodGroups.current.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handlePeriodChange(opt.value)}
                    style={{
                      padding: '10px 20px',
                      background: selectedPeriod === opt.value
                        ? 'linear-gradient(135deg, #667eea, #764ba2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: selectedPeriod === opt.value
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: selectedPeriod === opt.value ? '600' : '400',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
                {periodGroups.historical.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handlePeriodChange(opt.value)}
                    style={{
                      padding: '10px 20px',
                      background: selectedPeriod === opt.value
                        ? 'linear-gradient(135deg, #667eea, #764ba2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: selectedPeriod === opt.value
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: selectedPeriod === opt.value ? '600' : '400',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Level & Sort Filters */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Risk Filter */}
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Risk Level
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {riskOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRiskFilter(opt.value)}
                      style={{
                        padding: '8px 16px',
                        background: riskFilter === opt.value
                          ? opt.value === 'low' ? 'rgba(74, 222, 128, 0.2)'
                            : opt.value === 'medium' ? 'rgba(251, 191, 36, 0.2)'
                            : opt.value === 'high' ? 'rgba(248, 113, 113, 0.2)'
                            : 'rgba(102, 126, 234, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: riskFilter === opt.value
                          ? `1px solid ${opt.value === 'low' ? '#4ade80' : opt.value === 'medium' ? '#fbbf24' : opt.value === 'high' ? '#f87171' : '#667eea'}`
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: riskFilter === opt.value
                          ? opt.value === 'low' ? '#4ade80' : opt.value === 'medium' ? '#fbbf24' : opt.value === 'high' ? '#f87171' : 'white'
                          : 'rgba(255,255,255,0.7)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sort By
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      style={{
                        padding: '8px 16px',
                        background: sortBy === opt.value ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: sortBy === opt.value ? '1px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: sortBy === opt.value ? '#667eea' : 'rgba(255,255,255,0.7)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading indicator */}
            {copytradersLoading && (
              <div style={{ marginTop: '16px', color: '#667eea', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(102, 126, 234, 0.3)', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Updating results...
              </div>
            )}
          </div>

          {(loading || copytradersLoading) && copytraders.length === 0 ? (
            <div className="loading">
              <div className="loading-spinner" />
              <p>Loading CopyTraders...</p>
            </div>
          ) : (
            <div className="section">
              <h2 className="section-title">
                Top CopyTraders
                <span className="section-subtitle">
                  {getFilteredTraders().length} traders found
                  {riskFilter !== 'all' && ` • ${riskOptions.find(r => r.value === riskFilter)?.label}`}
                </span>
              </h2>
              {getFilteredTraders().length > 0 ? (
                <div className="card-grid">
                  {getFilteredTraders().slice(0, 12).map((trader, i) => (
                    <div key={trader.username || i} className="trader-card" onClick={() => handleCopyTraderClick(trader.username)}>
                      <div className="trader-header">
                        <div className="trader-avatar">
                          {(trader.name || trader.username || 'T').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="trader-name">{trader.name || trader.username}</div>
                          <div className="trader-username">@{trader.username}</div>
                        </div>
                      </div>
                      <div className="trader-stats">
                        <div className="trader-stat">
                          <div className="trader-stat-value">
                            {trader.gain !== undefined ? `${trader.gain >= 0 ? '+' : ''}${trader.gain?.toFixed(1)}%` : 'N/A'}
                          </div>
                          <div className="trader-stat-label">Gain</div>
                        </div>
                        <div className="trader-stat">
                          <div className="trader-stat-value" style={{ color: 'white' }}>
                            {trader.copiers?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="trader-stat-label">Copiers</div>
                        </div>
                        <div className="trader-stat">
                          <div className="trader-stat-value" style={{ color: '#667eea' }}>
                            {trader.riskScore || 'N/A'}
                          </div>
                          <div className="trader-stat-label">Risk</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>CopyTrader data not available</p>
                  <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
                    Visit eToro directly to explore CopyTraders
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Legal Disclaimer */}
      <div className="disclaimer">
        <div className="disclaimer-title">Important Disclaimer</div>
        <div className="disclaimer-text">
          <p>
            Trading involves significant risk of loss and is not suitable for all investors.
            Past performance is not indicative of future results. The information provided is for
            educational purposes only and should not be considered financial advice.
          </p>
          <p style={{ marginTop: 8 }}>
            eToro is a multi-asset platform which offers both investing in stocks and cryptoassets,
            as well as trading CFDs. CFDs are complex instruments and come with a high risk of losing
            money rapidly due to leverage. <strong>78% of retail investor accounts lose money when trading CFDs
            with this provider.</strong> You should consider whether you understand how CFDs work, and whether
            you can afford to take the high risk of losing your money.
          </p>
          <p style={{ marginTop: 8 }}>
            This content contains affiliate links. We may receive a commission for purchases made
            through these links at no additional cost to you.
            <a href="/go/etoro" target="_blank" rel="noopener noreferrer"> Learn more about eToro</a>.
          </p>
        </div>
      </div>
    </JournalLayout>
  );
}
