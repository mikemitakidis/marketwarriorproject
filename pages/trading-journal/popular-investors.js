import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';

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

    // Fetch user settings and affiliate URL in parallel
    const [settingsResult, affiliateResult] = await Promise.all([
      supabase
        .from('journal_settings')
        .select('*')
        .eq('journal_user_id', user.id)
        .maybeSingle(),
      supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'etoro_affiliate_url')
        .maybeSingle(),
    ]);

    const etoroAffiliateUrl = affiliateResult.data?.value || '';

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
        settings: settingsResult.data || null,
        etoroAffiliateUrl,
      },
    };
  } catch (err) {
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

/**
 * Build an affiliate URL by properly appending a path to a base URL.
 * Handles base URLs with query params (e.g., https://etoro.com/?ref=ABC)
 * Formula: [Admin_Panel_Base_URL] + [/] + [path]
 */
function buildAffiliateUrl(baseUrl, path) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    // Append path to pathname, preserving any query params
    url.pathname = url.pathname.replace(/\/$/, '') + '/' + path;
    return url.toString();
  } catch {
    // If URL parsing fails, simple concatenation
    return baseUrl.replace(/\/$/, '') + '/' + path;
  }
}

export default function PopularInvestorsPage({ user, settings, etoroAffiliateUrl }) {
  const [copytraders, setCopytraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copytradersLoading, setCopytradersLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('CurrYear');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('gain');
  const [dataSource, setDataSource] = useState('');

  // Build affiliate base URL (from admin panel or default)
  const affiliateBase = etoroAffiliateUrl || 'https://www.etoro.com';

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

  useEffect(() => {
    fetchCopytraders(selectedPeriod);
  }, []);

  const fetchCopytraders = async (period) => {
    setCopytradersLoading(true);
    try {
      const res = await fetch(`/api/journal/etoro/copytraders?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setCopytraders(data.traders || []);
        setDataSource(data.source || '');
      }
    } catch (err) {
      console.error('Error fetching copytraders:', err);
    } finally {
      setCopytradersLoading(false);
      setLoading(false);
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

  // Dynamic affiliate link: [Admin_Panel_Base_URL] + [/] + [investor_username]
  const getTraderUrl = (username) => {
    return buildAffiliateUrl(affiliateBase, `people/${username}`);
  };

  const getExploreUrl = () => {
    return buildAffiliateUrl(affiliateBase, 'copytrader');
  };

  const handleCopyTraderClick = (username) => {
    window.open(getTraderUrl(username), '_blank', 'noopener,noreferrer');
  };

  return (
    <JournalLayout user={user} title="Popular Investors" settings={settings}>
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
        .empty-state {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
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
        .data-source-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
          margin-left: 8px;
        }
        .data-source-badge.live {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
        }
        .data-source-badge.sample {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Popular Investors</h1>
        <p className="page-desc">Discover and copy top-performing traders on eToro</p>
      </div>

      <div className="etoro-banner">
        <div className="banner-content">
          <h2>Investor Discovery</h2>
          <p>Find and copy top traders based on your own filters</p>
        </div>
        <button className="banner-btn" onClick={() => window.open(getExploreUrl(), '_blank', 'noopener,noreferrer')}>
          Explore CopyTrader
        </button>
      </div>

      {/* Filter System */}
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
          <p>Loading Popular Investors...</p>
        </div>
      ) : (
        <div className="section">
          <h2 className="section-title">
            Top Investors
            <span className="section-subtitle">
              {getFilteredTraders().length} traders found
              {riskFilter !== 'all' && ` \u2022 ${riskOptions.find(r => r.value === riskFilter)?.label}`}
            </span>
            {dataSource && (
              <span className={`data-source-badge ${dataSource === 'etoro' ? 'live' : 'sample'}`}>
                {dataSource === 'etoro' ? 'LIVE' : 'SAMPLE'}
              </span>
            )}
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
              <p>No traders found matching your filters</p>
              <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
                Try adjusting the risk level or time period filters
              </p>
            </div>
          )}
        </div>
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
            <a href={affiliateBase} target="_blank" rel="noopener noreferrer"> Learn more about eToro</a>.
          </p>
        </div>
      </div>
    </JournalLayout>
  );
}
