import { getJournalUser } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';

export async function getServerSideProps({ req }) {
  try {
    // Use Trading Journal auth (completely separate from course)
    const journalUser = await getJournalUser(req);
    if (!journalUser) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    return {
      props: {
        user: {
          id: journalUser.id,  // This is journal_user_id
          email: journalUser.email,
          fullName: journalUser.full_name || null,
        },
        // Settings are now in journal_users table
        settings: {
          account_size: journalUser.account_size,
          base_currency: journalUser.base_currency,
          default_risk_percent: journalUser.default_risk_percent,
          timezone: journalUser.timezone,
        },
      },
    };
  } catch (err) {
    console.error('Journal dashboard error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

export default function JournalDashboard({ user, settings }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [showMoreStats, setShowMoreStats] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/stats?period=${period}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
    setLoading(false);
  };

  const formatCurrency = (value) => {
    const currency = settings?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatR = (value) => {
    if (value === null || value === undefined) return '0R';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`;
  };

  const totalPnl = stats?.stats?.totalPnl || 0;
  const pnlIsPositive = totalPnl >= 0;

  return (
    <JournalLayout user={user} title="Dashboard" settings={settings}>
      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
        }
        .period-selector {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05);
          padding: 3px;
          border-radius: 8px;
        }
        .period-btn {
          padding: 6px 14px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.8rem;
          transition: all 0.15s;
        }
        .period-btn:hover {
          color: white;
        }
        .period-btn.active {
          background: #667eea;
          color: white;
        }

        /* Hero P&L Card */
        .hero-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hero-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .hero-value {
          font-size: 3rem;
          font-weight: 700;
          line-height: 1;
        }
        .hero-value.positive { color: #4ade80; }
        .hero-value.negative { color: #f87171; }
        .hero-subtext {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .hero-right {
          display: flex;
          gap: 12px;
        }
        .cta-btn {
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }
        .cta-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .cta-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .cta-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        /* Today's Activity */
        .today-row {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .today-card {
          flex: 1;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
        }
        .today-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .today-value {
          font-size: 1.75rem;
          font-weight: 600;
          color: white;
        }
        .today-value.positive { color: #4ade80; }
        .today-value.negative { color: #f87171; }

        /* Core KPIs Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .kpi-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
        }
        .kpi-value.positive { color: #4ade80; }
        .kpi-value.negative { color: #f87171; }

        /* More Stats Section */
        .more-stats-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.15s;
          margin-bottom: 16px;
        }
        .more-stats-toggle:hover {
          background: rgba(255, 255, 255, 0.06);
          color: white;
        }
        .toggle-arrow {
          transition: transform 0.2s;
        }
        .toggle-arrow.open {
          transform: rotate(180deg);
        }
        .more-stats-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .stats-section {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
        }
        .stats-section-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: #818cf8;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .consistency-ring {
          width: 160px;
          height: 160px;
          margin: 0 auto;
          position: relative;
        }
        .ring-svg {
          transform: rotate(-90deg);
        }
        .ring-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 10;
        }
        .ring-progress {
          fill: none;
          stroke: #667eea;
          stroke-width: 10;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.5s ease;
        }
        .ring-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        .ring-value {
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }
        .ring-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stat-row:last-child {
          border-bottom: none;
        }
        .stat-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }
        .stat-value {
          font-weight: 500;
          color: white;
          font-size: 0.9rem;
        }
        .stat-value.positive { color: #4ade80; }
        .stat-value.negative { color: #f87171; }

        /* Violations Alert */
        .alert-card {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .alert-icon {
          font-size: 1.5rem;
        }
        .alert-text {
          color: #fca5a5;
          font-weight: 500;
        }
        .alert-btn {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 6px;
          color: #fca5a5;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.15s;
        }
        .alert-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          color: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 768px) {
          .hero-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .hero-right {
            width: 100%;
          }
          .hero-right .cta-btn {
            flex: 1;
            justify-content: center;
          }
          .today-row {
            flex-direction: column;
          }
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .more-stats-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Command Center</h1>
        <div className="period-selector">
          {['7d', '30d', '90d', 'ytd', 'all'].map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'ytd' ? 'YTD' : p === 'all' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading statistics...</div>
      ) : (
        <>
          {/* Hero P&L Card */}
          <div className="hero-card">
            <div className="hero-left">
              <div className="hero-label">Total P&L ({period === 'all' ? 'All Time' : period.toUpperCase()})</div>
              <div className={`hero-value ${pnlIsPositive ? 'positive' : 'negative'}`}>
                {formatCurrency(totalPnl)}
              </div>
              <div className="hero-subtext">
                {stats?.stats?.totalTrades || 0} trades | {stats?.stats?.winRate || 0}% win rate
              </div>
            </div>
            <div className="hero-right">
              <a href="/trading-journal/add-trade" className="cta-btn cta-primary">
                + Log Trade
              </a>
              <a href="/trading-journal/trades" className="cta-btn cta-secondary">
                View Log
              </a>
            </div>
          </div>

          {/* Today's Activity Row */}
          <div className="today-row">
            <div className="today-card">
              <div className="today-label">Today&apos;s Trades</div>
              <div className="today-value">{stats?.todayStats?.trades || 0}</div>
            </div>
            <div className="today-card">
              <div className="today-label">Today&apos;s P&L</div>
              <div className={`today-value ${(stats?.todayStats?.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(stats?.todayStats?.pnl)}
              </div>
            </div>
            <div className="today-card">
              <div className="today-label">Open Positions</div>
              <div className="today-value">{stats?.openTrades || 0}</div>
            </div>
          </div>

          {/* Core KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Win Rate</div>
              <div className="kpi-value">{stats?.stats?.winRate || 0}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Profit Factor</div>
              <div className={`kpi-value ${(stats?.stats?.profitFactor || 0) >= 1 ? 'positive' : 'negative'}`}>
                {stats?.stats?.profitFactor || 0}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Avg R-Multiple</div>
              <div className={`kpi-value ${(stats?.stats?.avgRMultiple || 0) >= 0 ? 'positive' : 'negative'}`}>
                {formatR(stats?.stats?.avgRMultiple)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Max Drawdown</div>
              <div className="kpi-value negative">
                {formatCurrency(stats?.stats?.maxDrawdown)}
              </div>
            </div>
          </div>

          {/* Rule Violations Alert */}
          {stats?.unacknowledgedViolations > 0 && (
            <div className="alert-card">
              <div className="alert-content">
                <span className="alert-icon">!</span>
                <span className="alert-text">
                  {stats.unacknowledgedViolations} Unacknowledged Rule Violation{stats.unacknowledgedViolations > 1 ? 's' : ''}
                </span>
              </div>
              <a href="/trading-journal/challenge" className="alert-btn">
                Review
              </a>
            </div>
          )}

          {/* Expandable More Stats */}
          <button
            className="more-stats-toggle"
            onClick={() => setShowMoreStats(!showMoreStats)}
          >
            <span>{showMoreStats ? 'Hide' : 'Show'} Detailed Stats</span>
            <span className={`toggle-arrow ${showMoreStats ? 'open' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </span>
          </button>

          {showMoreStats && (
            <div className="more-stats-content">
              {/* Consistency Score */}
              <div className="stats-section">
                <div className="stats-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                  </svg>
                  Consistency Score
                </div>
                <div className="consistency-ring">
                  <svg className="ring-svg" viewBox="0 0 160 160" width="160" height="160">
                    <circle className="ring-bg" cx="80" cy="80" r="65" />
                    <circle
                      className="ring-progress"
                      cx="80"
                      cy="80"
                      r="65"
                      strokeDasharray={`${2 * Math.PI * 65}`}
                      strokeDashoffset={`${2 * Math.PI * 65 * (1 - (stats?.stats?.consistencyScore || 0) / 100)}`}
                    />
                  </svg>
                  <div className="ring-center">
                    <div className="ring-value">{stats?.stats?.consistencyScore || 0}</div>
                    <div className="ring-label">out of 100</div>
                  </div>
                </div>
              </div>

              {/* Performance Breakdown */}
              <div className="stats-section">
                <div className="stats-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  Performance Breakdown
                </div>
                <div className="stat-row">
                  <span className="stat-label">Winning Trades</span>
                  <span className="stat-value positive">{stats?.stats?.winningTrades || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Losing Trades</span>
                  <span className="stat-value negative">{stats?.stats?.losingTrades || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Average Win</span>
                  <span className="stat-value positive">{formatCurrency(stats?.stats?.avgWin)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Average Loss</span>
                  <span className="stat-value negative">{formatCurrency(stats?.stats?.avgLoss)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Expectancy</span>
                  <span className={`stat-value ${(stats?.stats?.expectancy || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(stats?.stats?.expectancy)}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Largest Win</span>
                  <span className="stat-value positive">{formatCurrency(stats?.stats?.largestWin)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Largest Loss</span>
                  <span className="stat-value negative">{formatCurrency(stats?.stats?.largestLoss)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </JournalLayout>
  );
}
