import { getJournalUser, getServiceSupabase, checkJournalAccess } from '../../lib/journalAuth';
import JournalLayout from '../../components/journal/JournalLayout';
import { useState, useEffect } from 'react';

export async function getServerSideProps({ req, res }) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    // Check journal access (paid mode gating)
    const access = await checkJournalAccess(user);
    if (!access.hasAccess && access.requiresPayment) {
      return { redirect: { destination: '/trading-journal/upgrade', permanent: false } };
    }

    const supabase = getServiceSupabase();

    // Get journal settings using journal user id
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
    console.error('Journal dashboard error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

export default function JournalDashboard({ user, settings }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

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

  return (
    <JournalLayout user={user} title="Dashboard" settings={settings}>
      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .period-selector {
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 8px;
        }
        .period-btn {
          padding: 8px 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .period-btn:hover {
          color: white;
        }
        .period-btn.active {
          background: #667eea;
          color: white;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: all 0.2s;
        }
        .metric-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .metric-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }
        .metric-value.positive { color: #4ade80; }
        .metric-value.negative { color: #f87171; }
        .section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .consistency-ring {
          width: 200px;
          height: 200px;
          margin: 0 auto;
          position: relative;
        }
        .ring-svg {
          transform: rotate(-90deg);
        }
        .ring-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 12;
        }
        .ring-progress {
          fill: none;
          stroke: #667eea;
          stroke-width: 12;
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
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
        }
        .ring-label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .quick-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .quick-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }
        .quick-stat-label {
          color: rgba(255, 255, 255, 0.7);
        }
        .quick-stat-value {
          font-weight: 600;
          color: white;
        }
        .today-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .today-title {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 16px;
        }
        .today-stats {
          display: flex;
          gap: 40px;
        }
        .today-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .today-stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }
        .cta-buttons {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }
        .cta-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
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
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .cta-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
          color: rgba(255, 255, 255, 0.5);
        }
        @media (max-width: 768px) {
          .two-col {
            grid-template-columns: 1fr;
          }
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
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

      {/* Today's Summary */}
      <div className="today-card">
        <div className="today-title">📅 Today&apos;s Activity</div>
        <div className="today-stats">
          <div>
            <div className="today-stat-value">{stats?.todayStats?.trades || 0}</div>
            <div className="today-stat-label">Trades</div>
          </div>
          <div>
            <div className={`today-stat-value ${(stats?.todayStats?.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(stats?.todayStats?.pnl)}
            </div>
            <div className="today-stat-label">P&L</div>
          </div>
          <div>
            <div className="today-stat-value">{stats?.openTrades || 0}</div>
            <div className="today-stat-label">Open Positions</div>
          </div>
        </div>
        <div className="cta-buttons">
          <a href="/trading-journal/add-trade" className="cta-btn cta-primary">
            ➕ Log New Trade
          </a>
          <a href="/trading-journal/trades" className="cta-btn cta-secondary">
            📝 View Trade Log
          </a>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading statistics...</div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total P&L</div>
              <div className={`metric-value ${(stats?.stats?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(stats?.stats?.totalPnl)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Win Rate</div>
              <div className="metric-value">{stats?.stats?.winRate || 0}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Profit Factor</div>
              <div className={`metric-value ${(stats?.stats?.profitFactor || 0) >= 1 ? 'positive' : 'negative'}`}>
                {stats?.stats?.profitFactor || 0}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Trades</div>
              <div className="metric-value">{stats?.stats?.totalTrades || 0}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg R-Multiple</div>
              <div className={`metric-value ${(stats?.stats?.avgRMultiple || 0) >= 0 ? 'positive' : 'negative'}`}>
                {formatR(stats?.stats?.avgRMultiple)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Max Drawdown</div>
              <div className="metric-value negative">
                {formatCurrency(stats?.stats?.maxDrawdown)}
              </div>
            </div>
          </div>

          <div className="two-col">
            {/* Consistency Score */}
            <div className="section">
              <div className="section-title">🎯 Consistency Score</div>
              <div className="consistency-ring">
                <svg className="ring-svg" viewBox="0 0 200 200">
                  <circle className="ring-bg" cx="100" cy="100" r="85" />
                  <circle
                    className="ring-progress"
                    cx="100"
                    cy="100"
                    r="85"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - (stats?.stats?.consistencyScore || 0) / 100)}`}
                  />
                </svg>
                <div className="ring-center">
                  <div className="ring-value">{stats?.stats?.consistencyScore || 0}</div>
                  <div className="ring-label">out of 100</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="section">
              <div className="section-title">📈 Performance Breakdown</div>
              <div className="quick-stats">
                <div className="quick-stat">
                  <span className="quick-stat-label">Winning Trades</span>
                  <span className="quick-stat-value positive">{stats?.stats?.winningTrades || 0}</span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Losing Trades</span>
                  <span className="quick-stat-value negative">{stats?.stats?.losingTrades || 0}</span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Average Win</span>
                  <span className="quick-stat-value positive">{formatCurrency(stats?.stats?.avgWin)}</span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Average Loss</span>
                  <span className="quick-stat-value negative">{formatCurrency(stats?.stats?.avgLoss)}</span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Expectancy</span>
                  <span className={`quick-stat-value ${(stats?.stats?.expectancy || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(stats?.stats?.expectancy)}
                  </span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Largest Win</span>
                  <span className="quick-stat-value positive">{formatCurrency(stats?.stats?.largestWin)}</span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Largest Loss</span>
                  <span className="quick-stat-value negative">{formatCurrency(stats?.stats?.largestLoss)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rule Violations Alert */}
          {stats?.unacknowledgedViolations > 0 && (
            <div className="section" style={{ borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div className="section-title" style={{ color: '#f87171' }}>
                ⚠️ {stats.unacknowledgedViolations} Unacknowledged Rule Violation{stats.unacknowledgedViolations > 1 ? 's' : ''}
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
                Review your rule violations to stay on track with your trading discipline.
              </p>
              <a href="/trading-journal/challenge" className="cta-btn cta-secondary" style={{ borderColor: '#f87171', color: '#f87171' }}>
                Review Violations
              </a>
            </div>
          )}
        </>
      )}
    </JournalLayout>
  );
}
