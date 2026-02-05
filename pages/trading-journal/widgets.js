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
  const [curatedLists, setCuratedLists] = useState([]);
  const [trending, setTrending] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [copytraders, setCopytraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeTab === 'etoro') {
      fetchEtoroData();
    }
  }, [activeTab]);

  const fetchEtoroData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all eToro data in parallel
      const [listsRes, trendingRes, gainersRes, losersRes, copyRes] = await Promise.allSettled([
        fetch('/api/journal/etoro/curated-lists'),
        fetch('/api/journal/etoro/trending'),
        fetch('/api/journal/etoro/market-movers?type=gainers'),
        fetch('/api/journal/etoro/market-movers?type=losers'),
        fetch('/api/journal/etoro/copytraders'),
      ]);

      // Process results - handle partial failures gracefully
      if (listsRes.status === 'fulfilled' && listsRes.value.ok) {
        const data = await listsRes.value.json();
        setCuratedLists(data.lists || data || []);
      }

      if (trendingRes.status === 'fulfilled' && trendingRes.value.ok) {
        const data = await trendingRes.value.json();
        setTrending(data.assets || data || []);
      }

      if (gainersRes.status === 'fulfilled' && gainersRes.value.ok) {
        const data = await gainersRes.value.json();
        setGainers(data.assets || data || []);
      }

      if (losersRes.status === 'fulfilled' && losersRes.value.ok) {
        const data = await losersRes.value.json();
        setLosers(data.assets || data || []);
      }

      if (copyRes.status === 'fulfilled' && copyRes.value.ok) {
        const data = await copyRes.value.json();
        setCopytraders(data.traders || data || []);
      }
    } catch (err) {
      console.error('Error fetching eToro data:', err);
      setError('Failed to load eToro data');
    } finally {
      setLoading(false);
    }
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

          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              <p>Loading market data...</p>
            </div>
          ) : error ? (
            <div className="error-box">
              <p>{error}</p>
              <button onClick={fetchEtoroData} style={{ marginTop: 12, padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Trending Assets */}
              <div className="section">
                <h2 className="section-title">
                  Trending Assets
                  <span className="section-subtitle">Popular right now</span>
                </h2>
                {trending.length > 0 ? (
                  <div className="card-grid">
                    {trending.slice(0, 8).map((asset, i) => (
                      <div key={asset.symbol || i} className="asset-card" onClick={() => handleTradeClick(asset.symbol)}>
                        <div className="asset-header">
                          <div>
                            <div className="asset-symbol">{asset.symbol}</div>
                            <div className="asset-name">{asset.name}</div>
                          </div>
                          {asset.change !== undefined && (
                            <div className={`asset-change ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                              {asset.change >= 0 ? '+' : ''}{asset.change?.toFixed(2)}%
                            </div>
                          )}
                        </div>
                        {asset.price && <div className="asset-price">${asset.price?.toFixed(2)}</div>}
                        <button className="trade-btn">Trade on eToro</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No trending data available</div>
                )}
              </div>

              {/* Top Gainers & Losers */}
              <div className="two-columns">
                <div className="section">
                  <h2 className="section-title" style={{ color: '#4ade80' }}>
                    Top Gainers
                  </h2>
                  {gainers.length > 0 ? (
                    <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
                      {gainers.slice(0, 5).map((asset, i) => (
                        <div key={asset.symbol || i} className="asset-card" onClick={() => handleTradeClick(asset.symbol)}>
                          <div className="asset-header">
                            <div>
                              <div className="asset-symbol">{asset.symbol}</div>
                              <div className="asset-name">{asset.name}</div>
                            </div>
                            <div className="asset-change positive">
                              +{asset.change?.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No data available</div>
                  )}
                </div>

                <div className="section">
                  <h2 className="section-title" style={{ color: '#f87171' }}>
                    Top Losers
                  </h2>
                  {losers.length > 0 ? (
                    <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
                      {losers.slice(0, 5).map((asset, i) => (
                        <div key={asset.symbol || i} className="asset-card" onClick={() => handleTradeClick(asset.symbol)}>
                          <div className="asset-header">
                            <div>
                              <div className="asset-symbol">{asset.symbol}</div>
                              <div className="asset-name">{asset.name}</div>
                            </div>
                            <div className="asset-change negative">
                              {asset.change?.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No data available</div>
                  )}
                </div>
              </div>

              {/* Curated Lists */}
              {curatedLists.length > 0 && (
                <div className="section">
                  <h2 className="section-title">
                    Curated Watchlists
                    <span className="section-subtitle">Expert-picked collections</span>
                  </h2>
                  <div className="card-grid">
                    {curatedLists.map((list, i) => (
                      <div key={list.id || i} className="list-card">
                        <div className="list-name">{list.name}</div>
                        <div className="list-desc">{list.description}</div>
                        {list.count && <div className="list-count">{list.count} assets</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'copytraders' && (
        <>
          <div className="etoro-banner">
            <div className="banner-content">
              <h2>Copy Top Traders</h2>
              <p>Automatically copy the trades of successful investors</p>
            </div>
            <button className="banner-btn" onClick={() => window.open('/go/etoro-copytrader', '_blank', 'noopener,noreferrer')}>
              Explore CopyTrader
            </button>
          </div>

          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              <p>Loading CopyTraders...</p>
            </div>
          ) : (
            <div className="section">
              <h2 className="section-title">
                Top CopyTraders
                <span className="section-subtitle">Leaderboard</span>
              </h2>
              {copytraders.length > 0 ? (
                <div className="card-grid">
                  {copytraders.slice(0, 12).map((trader, i) => (
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
