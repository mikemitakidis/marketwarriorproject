import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect, useCallback, useRef } from 'react';

// Exchange options for the instrument search filter
const exchangeOptions = [
  { value: '', label: 'All Exchanges' },
  { value: 'NASDAQ', label: 'NASDAQ' },
  { value: 'NYSE', label: 'NYSE' },
  { value: 'LSE', label: 'London (LSE)' },
  { value: 'XETRA', label: 'Frankfurt (XETRA)' },
  { value: 'TSE', label: 'Tokyo (TSE)' },
  { value: 'HKEX', label: 'Hong Kong (HKEX)' },
];

// Asset type tabs for the instrument search
const assetTypeTabs = [
  { value: '', label: 'All', icon: '' },
  { value: 'stocks', label: 'Stocks', icon: '' },
  { value: 'crypto', label: 'Crypto', icon: '' },
  { value: 'indices', label: 'Indices', icon: '' },
  { value: 'commodities', label: 'Commodities', icon: '' },
  { value: 'etfs', label: 'ETFs', icon: '' },
  { value: 'forex', label: 'Forex', icon: '' },
];

// Sort options for search results
const searchSortOptions = [
  { value: 'default', label: 'Default' },
  { value: 'changeDesc', label: 'Daily Gain % (High to Low)' },
  { value: 'changeAsc', label: 'Daily Loss % (Low to High)' },
  { value: 'symbolAz', label: 'Symbol A-Z' },
  { value: 'symbolZa', label: 'Symbol Z-A' },
];

// Trending count options
const trendingCountOptions = [5, 10, 15, 20];

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

  // CopyTraders state
  const [copytraders, setCopytraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copytradersLoading, setCopytradersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('CurrYear');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('gain');

  // eToro Markets - Trending Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trendingCount, setTrendingCount] = useState(10);
  const [trendingFilter, setTrendingFilter] = useState('');

  // eToro Markets - Search Instruments state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [searchSortBy, setSearchSortBy] = useState('default');
  const searchDebounceRef = useRef(null);

  // Period options for CopyTraders filter
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

  const riskOptions = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'low', label: 'Low (1-3)', min: 1, max: 3 },
    { value: 'medium', label: 'Medium (4-6)', min: 4, max: 6 },
    { value: 'high', label: 'High (7-10)', min: 7, max: 10 },
  ];

  const sortOptions = [
    { value: 'gain', label: 'Highest Gain' },
    { value: 'copiers', label: 'Most Copiers' },
    { value: 'risk', label: 'Lowest Risk' },
  ];

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'etoro') {
      fetchRecommendations(trendingCount);
      fetchSearchResults();
    } else if (activeTab === 'copytraders') {
      fetchCopytraders(selectedPeriod);
    }
  }, [activeTab]);

  // Re-fetch trending when count changes
  useEffect(() => {
    if (activeTab === 'etoro') {
      fetchRecommendations(trendingCount);
    }
  }, [trendingCount]);

  // Re-fetch search when asset type or exchange changes
  useEffect(() => {
    if (activeTab === 'etoro') {
      fetchSearchResults();
    }
  }, [selectedAssetType, selectedExchange]);

  // === TRENDING RECOMMENDATIONS ===
  const fetchRecommendations = async (count) => {
    setRecommendationsLoading(true);
    try {
      const res = await fetch(`/api/journal/etoro/market-recommendations?count=${count}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const getFilteredRecommendations = () => {
    let items = [...recommendations];
    if (trendingFilter) {
      items = items.filter(r => r.assetType === trendingFilter);
    }
    return items;
  };

  // === SEARCH INSTRUMENTS ===
  const fetchSearchResults = async (query = '') => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (selectedAssetType) params.set('assetType', selectedAssetType);
      if (selectedExchange) params.set('exchange', selectedExchange);
      const paramString = params.toString();
      const url = paramString ? `/api/journal/market-data?${paramString}` : '/api/journal/market-data';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.prices || {});
      }
    } catch (err) {
      console.error('Error fetching search results:', err);
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSearchResults(searchQuery.trim());
  };

  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    // Debounced live search
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        fetchSearchResults(val.trim());
      }, 500);
    }
  };

  const getSortedSearchResults = () => {
    const entries = Object.entries(searchResults);
    switch (searchSortBy) {
      case 'changeDesc':
        return entries.sort((a, b) => (b[1]?.change || 0) - (a[1]?.change || 0));
      case 'changeAsc':
        return entries.sort((a, b) => (a[1]?.change || 0) - (b[1]?.change || 0));
      case 'symbolAz':
        return entries.sort((a, b) => a[0].localeCompare(b[0]));
      case 'symbolZa':
        return entries.sort((a, b) => b[0].localeCompare(a[0]));
      default:
        return entries;
    }
  };

  // Format price based on asset type
  const formatPrice = (price, symbol) => {
    if (!price && price !== 0) return '---';
    if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'].includes(symbol)) {
      return price.toFixed(4);
    }
    if (['BTC', 'ETH'].includes(symbol)) {
      return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (['XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'SOL'].includes(symbol)) {
      return '$' + price.toFixed(4);
    }
    if (['GOLD', 'SILVER', 'OIL', 'NATGAS', 'COPPER', 'PLATINUM'].includes(symbol)) {
      return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (['SPX500', 'NSDQ100', 'DJ30', 'UK100', 'GER40', 'JPN225'].includes(symbol)) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // === COPYTRADERS ===
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

  const getFilteredTraders = () => {
    let filtered = [...copytraders];
    if (riskFilter !== 'all') {
      const riskOption = riskOptions.find(r => r.value === riskFilter);
      if (riskOption && riskOption.min !== undefined) {
        filtered = filtered.filter(t =>
          t.riskScore >= riskOption.min && t.riskScore <= riskOption.max
        );
      }
    }
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
        .section-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
        }
        .filter-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 16px;
        }
        .filter-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .filter-btn.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border-color: rgba(102, 126, 234, 0.5);
          color: #667eea;
          font-weight: 600;
        }
        .select-input {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: white;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
        }
        .select-input option {
          background: #1a1a2e;
          color: white;
        }
        .search-input {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          font-size: 0.9rem;
          outline: none;
          flex: 1;
          min-width: 200px;
        }
        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .search-input:focus {
          border-color: rgba(102, 126, 234, 0.5);
        }
        .search-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .search-btn:hover {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .clear-btn {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .slider-track {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .inline-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #667eea;
          font-size: 0.85rem;
          margin-top: 12px;
        }
        .mini-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @media (max-width: 768px) {
          .slider-track {
            flex-wrap: wrap;
          }
          .slider-input {
            width: 100%;
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

          {/* ========================================= */}
          {/* SECTION 1: TRENDING MARKET RECOMMENDATIONS */}
          {/* ========================================= */}
          <div className="section-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Trending Now
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '400' }}>
                    Hot assets on eToro
                  </span>
                </h2>
              </div>
              <div className="slider-track">
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Show:</span>
                {trendingCountOptions.map(count => (
                  <button
                    key={count}
                    className={`filter-btn ${trendingCount === count ? 'active' : ''}`}
                    onClick={() => setTrendingCount(count)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Top {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending asset type filter */}
            <div className="filter-row">
              <button
                className={`filter-btn ${trendingFilter === '' ? 'active' : ''}`}
                onClick={() => setTrendingFilter('')}
              >
                All
              </button>
              <button
                className={`filter-btn ${trendingFilter === 'stocks' ? 'active' : ''}`}
                onClick={() => setTrendingFilter('stocks')}
              >
                Stocks
              </button>
              <button
                className={`filter-btn ${trendingFilter === 'crypto' ? 'active' : ''}`}
                onClick={() => setTrendingFilter('crypto')}
              >
                Crypto
              </button>
              <button
                className={`filter-btn ${trendingFilter === 'etfs' ? 'active' : ''}`}
                onClick={() => setTrendingFilter('etfs')}
              >
                ETFs
              </button>
              <button
                className={`filter-btn ${trendingFilter === 'commodities' ? 'active' : ''}`}
                onClick={() => setTrendingFilter('commodities')}
              >
                Commodities
              </button>
            </div>

            {recommendationsLoading ? (
              <div className="loading">
                <div className="loading-spinner" />
                <p>Loading trending assets...</p>
              </div>
            ) : getFilteredRecommendations().length > 0 ? (
              <div className="card-grid">
                {getFilteredRecommendations().map((item, i) => {
                  const isPositive = (item.change || 0) >= 0;
                  return (
                    <div
                      key={item.symbol + '-' + i}
                      className="asset-card"
                      onClick={() => handleTradeClick(item.symbol)}
                    >
                      <div className="asset-header">
                        <div>
                          <div className="asset-symbol">
                            {item.symbol}
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(251, 191, 36, 0.15)',
                              color: '#fbbf24',
                              fontWeight: '500',
                            }}>
                              TRENDING
                            </span>
                          </div>
                          <div className="asset-name">{item.name}</div>
                        </div>
                        {item.change !== undefined && item.change !== 0 && (
                          <div className={`asset-change ${isPositive ? 'positive' : 'negative'}`}>
                            {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      {item.price !== undefined && item.price > 0 && (
                        <div className="asset-price">{formatPrice(item.price, item.symbol)}</div>
                      )}
                      <button className="trade-btn" onClick={(e) => { e.stopPropagation(); handleTradeClick(item.symbol); }}>
                        Trade on eToro
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No trending assets found for this filter.</p>
                <p style={{ marginTop: 8, fontSize: '0.85rem' }}>Try selecting a different category or adjusting the count.</p>
              </div>
            )}
          </div>

          {/* ========================================= */}
          {/* SECTION 2: SEARCH INSTRUMENTS             */}
          {/* ========================================= */}
          <div className="section-box">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Search Instruments
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '400' }}>
                  Real-time prices from eToro
                </span>
              </h2>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="search-input"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search instruments (e.g., Apple, Bitcoin, Gold)..."
                  style={{ maxWidth: '400px' }}
                />
                <button type="submit" className="search-btn">
                  Search
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => { setSearchQuery(''); fetchSearchResults(); }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* Asset Type Tabs */}
            <div className="filter-row">
              {assetTypeTabs.map(tab => (
                <button
                  key={tab.value}
                  className={`filter-btn ${selectedAssetType === tab.value ? 'active' : ''}`}
                  onClick={() => setSelectedAssetType(tab.value)}
                >
                  {tab.icon && <span style={{ marginRight: '4px' }}>{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Exchange + Sort Filters */}
            <div className="filter-row">
              <select
                className="select-input"
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
              >
                {exchangeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                className="select-input"
                value={searchSortBy}
                onChange={(e) => setSearchSortBy(e.target.value)}
              >
                {searchSortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {searchLoading && (
                <div className="inline-loading">
                  <div className="mini-spinner" />
                  Updating...
                </div>
              )}
            </div>

            {/* Results */}
            {searchLoading && Object.keys(searchResults).length === 0 ? (
              <div className="loading">
                <div className="loading-spinner" />
                <p>Loading live prices from eToro...</p>
              </div>
            ) : getSortedSearchResults().length > 0 ? (
              <>
                <div style={{ marginBottom: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  Showing {Math.min(getSortedSearchResults().length, 24)} of {getSortedSearchResults().length} instruments
                  {selectedAssetType && ` in ${assetTypeTabs.find(t => t.value === selectedAssetType)?.label || selectedAssetType}`}
                  {selectedExchange && ` on ${selectedExchange}`}
                </div>
                <div className="card-grid">
                  {getSortedSearchResults().slice(0, 24).map(([symbol, data]) => {
                    const price = data?.price;
                    const change = data?.change;
                    const isPositive = (change || 0) >= 0;
                    const name = data?.name || symbol;

                    return (
                      <div
                        key={symbol}
                        className="asset-card"
                        onClick={() => handleTradeClick(symbol)}
                      >
                        <div className="asset-header">
                          <div>
                            <div className="asset-symbol">{symbol}</div>
                            <div className="asset-name">
                              {name}
                              {data?.exchange && (
                                <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                                  {data.exchange}
                                </span>
                              )}
                            </div>
                          </div>
                          {change !== undefined && change !== 0 && (
                            <div className={`asset-change ${isPositive ? 'positive' : 'negative'}`}>
                              {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </div>
                          )}
                        </div>
                        {price !== undefined && price > 0 && (
                          <div className="asset-price">{formatPrice(price, symbol)}</div>
                        )}
                        <button className="trade-btn" onClick={(e) => { e.stopPropagation(); handleTradeClick(symbol); }}>
                          Trade on eToro
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>No instruments found.</p>
                <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
                  Try a different search term, asset type, or exchange filter.
                </p>
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
                View All Markets on eToro &rarr;
              </button>
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
