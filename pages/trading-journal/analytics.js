import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import JournalLayout from '../../components/journal/JournalLayout';
import { getJournalUser, getServiceSupabase } from '../../lib/journalAuth';

export default function AnalyticsPage({ user, settings }) {
  const [analytics, setAnalytics] = useState(null);
  const [tiltData, setTiltData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
    fetchTiltData();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/journal/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiltData = async () => {
    try {
      const res = await fetch('/api/journal/tilt-detection');
      if (res.ok) {
        const data = await res.json();
        setTiltData(data);
      }
    } catch (err) {
      console.error('Failed to fetch tilt data:', err);
    }
  };

  if (loading) {
    return (
      <JournalLayout user={user} title="Analytics" settings={settings}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.6)' }}>
          Loading analytics...
        </div>
      </JournalLayout>
    );
  }

  const { summary, maeAnalysis, mfeAnalysis, timeAnalysis, sessionAnalysis, directionAnalysis, streaks, equityCurve, weeklyPerformance, monthlyPerformance, tagAnalysis } = analytics || {};

  return (
    <JournalLayout user={user} title="Analytics" settings={settings}>
      <style jsx>{`
        .header {
          margin-bottom: 24px;
        }
        h1 {
          color: white;
          font-size: 1.8rem;
          margin-bottom: 8px;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        .tab {
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          white-space: nowrap;
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
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          text-align: center;
        }
        .stat-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .stat-value {
          color: white;
          font-size: 1.8rem;
          font-weight: 700;
        }
        .stat-value.positive { color: #10b981; }
        .stat-value.negative { color: #ef4444; }
        .stat-value.neutral { color: #fbbf24; }
        .section {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
          margin-bottom: 24px;
        }
        .section-title {
          color: white;
          font-size: 1.1rem;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tilt-meter {
          margin-bottom: 24px;
        }
        .tilt-bar {
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }
        .tilt-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.5s ease;
        }
        .tilt-label {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .tilt-message {
          margin-top: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        .analysis-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 20px;
        }
        .analysis-title {
          color: white;
          font-size: 1rem;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .analysis-stat {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .analysis-stat:last-child {
          border-bottom: none;
        }
        .analysis-stat-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
        .analysis-stat-value {
          color: white;
          font-weight: 600;
        }
        .insight-box {
          margin-top: 16px;
          padding: 14px;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .table-container {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        th {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 600;
        }
        td {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .equity-chart {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 150px;
          padding: 20px 0;
        }
        .equity-bar {
          flex: 1;
          min-width: 4px;
          border-radius: 2px 2px 0 0;
          transition: all 0.2s;
        }
        .equity-bar:hover {
          opacity: 0.8;
        }
        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin-right: 12px;
          margin-bottom: 8px;
        }
        .streak-badge.win {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .streak-badge.loss {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .distribution-chart {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          height: 100px;
          margin-top: 16px;
        }
        .distribution-bar {
          flex: 1;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 4px 4px 0 0;
          position: relative;
        }
        .distribution-label {
          position: absolute;
          bottom: -24px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
        }
        .no-data {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.5);
        }
        .tag-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .tag-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .tag-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .tag-category {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .tag-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .tag-stat {
          text-align: center;
        }
        .tag-stat-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .tag-stat-value {
          font-size: 1rem;
          font-weight: 600;
          color: white;
        }
        .top-tags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .top-tag-card {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .top-tag-card.negative {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
          border-color: rgba(239, 68, 68, 0.2);
        }
        .top-tag-rank {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .top-tag-name {
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        }
        .top-tag-pnl {
          font-size: 1.3rem;
          font-weight: 700;
        }
        .direction-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .direction-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .direction-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }
        .direction-title {
          color: white;
          font-size: 1rem;
          margin-bottom: 16px;
        }
        .direction-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
      `}</style>

      <div className="header">
        <h1>Advanced Analytics</h1>
        <p className="subtitle">Deep dive into your trading performance</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
          Tag Performance
        </button>
        <button className={`tab ${activeTab === 'mae-mfe' ? 'active' : ''}`} onClick={() => setActiveTab('mae-mfe')}>
          MAE/MFE Analysis
        </button>
        <button className={`tab ${activeTab === 'time' ? 'active' : ''}`} onClick={() => setActiveTab('time')}>
          Time Analysis
        </button>
        <button className={`tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
          Performance History
        </button>
      </div>

      {/* Tilt Meter - Always Visible */}
      {tiltData && (
        <div className="section tilt-meter">
          <div className="section-title">
            🎯 Tilt Meter (Last 7 Days)
          </div>
          <div className="tilt-bar">
            <div
              className="tilt-fill"
              style={{
                width: `${tiltData.tiltMeter}%`,
                background: tiltData.recommendation?.color || '#22c55e',
              }}
            />
            <span className="tilt-label">{tiltData.tiltMeter}%</span>
          </div>
          <div
            className="tilt-message"
            style={{
              background: `${tiltData.recommendation?.color}20`,
              border: `1px solid ${tiltData.recommendation?.color}40`,
              color: tiltData.recommendation?.color,
            }}
          >
            {tiltData.recommendation?.message}
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Trades</div>
              <div className="stat-value">{summary?.totalTrades || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Win Rate</div>
              <div className={`stat-value ${(summary?.winRate || 0) >= 50 ? 'positive' : 'negative'}`}>
                {summary?.winRate || 0}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Profit Factor</div>
              <div className={`stat-value ${(summary?.profitFactor || 0) >= 1 ? 'positive' : 'negative'}`}>
                {summary?.profitFactor || 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg R-Multiple</div>
              <div className={`stat-value ${(summary?.avgRMultiple || 0) >= 0 ? 'positive' : 'negative'}`}>
                {summary?.avgRMultiple || 0}R
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total P&L</div>
              <div className={`stat-value ${(summary?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                ${(summary?.totalPnl || 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Expectancy</div>
              <div className={`stat-value ${(summary?.expectancy || 0) >= 0 ? 'positive' : 'negative'}`}>
                ${summary?.expectancy || 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Largest Win</div>
              <div className="stat-value positive">${summary?.largestWin || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Largest Loss</div>
              <div className="stat-value negative">${Math.abs(summary?.largestLoss || 0)}</div>
            </div>
          </div>

          {/* Streaks */}
          {streaks && (
            <div className="section">
              <div className="section-title">🔥 Win/Loss Streaks</div>
              <span className="streak-badge win">
                Best Win Streak: {streaks.maxWinStreak}
              </span>
              <span className="streak-badge loss">
                Worst Loss Streak: {streaks.maxLossStreak}
              </span>
              <span className={`streak-badge ${streaks.currentStreak >= 0 ? 'win' : 'loss'}`}>
                Current: {streaks.currentStreak > 0 ? '+' : ''}{streaks.currentStreak}
              </span>
            </div>
          )}

          {/* Direction Analysis */}
          {directionAnalysis && (
            <div className="section">
              <div className="section-title">📊 Long vs Short Performance</div>
              <div className="direction-grid">
                {directionAnalysis.long && (
                  <div className="direction-card">
                    <div className="direction-icon">📈</div>
                    <div className="direction-title">Long Trades</div>
                    <div className="direction-stats">
                      <div>
                        <div className="stat-label">Trades</div>
                        <div className="stat-value">{directionAnalysis.long.trades}</div>
                      </div>
                      <div>
                        <div className="stat-label">Win Rate</div>
                        <div className={`stat-value ${directionAnalysis.long.winRate >= 50 ? 'positive' : 'negative'}`}>
                          {directionAnalysis.long.winRate}%
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Avg R</div>
                        <div className={`stat-value ${directionAnalysis.long.avgR >= 0 ? 'positive' : 'negative'}`}>
                          {directionAnalysis.long.avgR}R
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">P&L</div>
                        <div className={`stat-value ${directionAnalysis.long.pnl >= 0 ? 'positive' : 'negative'}`}>
                          ${directionAnalysis.long.pnl}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {directionAnalysis.short && (
                  <div className="direction-card">
                    <div className="direction-icon">📉</div>
                    <div className="direction-title">Short Trades</div>
                    <div className="direction-stats">
                      <div>
                        <div className="stat-label">Trades</div>
                        <div className="stat-value">{directionAnalysis.short.trades}</div>
                      </div>
                      <div>
                        <div className="stat-label">Win Rate</div>
                        <div className={`stat-value ${directionAnalysis.short.winRate >= 50 ? 'positive' : 'negative'}`}>
                          {directionAnalysis.short.winRate}%
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Avg R</div>
                        <div className={`stat-value ${directionAnalysis.short.avgR >= 0 ? 'positive' : 'negative'}`}>
                          {directionAnalysis.short.avgR}R
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">P&L</div>
                        <div className={`stat-value ${directionAnalysis.short.pnl >= 0 ? 'positive' : 'negative'}`}>
                          ${directionAnalysis.short.pnl}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Performance */}
          {sessionAnalysis && sessionAnalysis.length > 0 && (
            <div className="section">
              <div className="section-title">🌍 Session Performance</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>Avg R</th>
                      <th>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionAnalysis.map((s, i) => (
                      <tr key={i}>
                        <td>{s.session}</td>
                        <td>{s.trades}</td>
                        <td className={s.winRate >= 50 ? 'positive' : 'negative'}>{s.winRate}%</td>
                        <td className={s.avgR >= 0 ? 'positive' : 'negative'}>{s.avgR}R</td>
                        <td className={s.pnl >= 0 ? 'positive' : 'negative'}>${s.pnl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <>
          {tagAnalysis ? (
            <>
              {/* Summary Stats */}
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <div className="stat-label">Tagged Trades</div>
                  <div className="stat-value">{tagAnalysis.totalTaggedTrades}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Setup Tags</div>
                  <div className="stat-value">{tagAnalysis.setupTags?.length || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Mistake Tags</div>
                  <div className="stat-value">{tagAnalysis.mistakeTags?.length || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Emotion Tags</div>
                  <div className="stat-value">{tagAnalysis.emotionTags?.length || 0}</div>
                </div>
              </div>

              {/* Top Profitable Tags */}
              {tagAnalysis.topProfitableTags && tagAnalysis.topProfitableTags.length > 0 && (
                <div className="section">
                  <div className="section-title">🏆 Top Profitable Setups</div>
                  <div className="top-tags-grid">
                    {tagAnalysis.topProfitableTags.map((tag, i) => (
                      <div key={tag.id} className="top-tag-card">
                        <div className="top-tag-rank">#{i + 1} Most Profitable</div>
                        <div className="top-tag-name">{tag.name}</div>
                        <div className="top-tag-pnl positive">${tag.totalPnl}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                          {tag.totalTrades} trades • {tag.winRate}% win rate
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Worst Tags */}
              {tagAnalysis.worstTags && tagAnalysis.worstTags.some(t => t.totalPnl < 0) && (
                <div className="section">
                  <div className="section-title">⚠️ Areas to Improve</div>
                  <div className="top-tags-grid">
                    {tagAnalysis.worstTags.filter(t => t.totalPnl < 0).map((tag, i) => (
                      <div key={tag.id} className="top-tag-card negative">
                        <div className="top-tag-rank">{tag.category}</div>
                        <div className="top-tag-name">{tag.name}</div>
                        <div className="top-tag-pnl negative">${tag.totalPnl}</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                          {tag.totalTrades} trades • {tag.winRate}% win rate
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup Tags Performance */}
              {tagAnalysis.setupTags && tagAnalysis.setupTags.length > 0 && (
                <div className="section">
                  <div className="section-title">🎯 Setup Performance</div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Setup</th>
                          <th>Trades</th>
                          <th>Win Rate</th>
                          <th>Avg R</th>
                          <th>Profit Factor</th>
                          <th>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tagAnalysis.setupTags.map(tag => (
                          <tr key={tag.id}>
                            <td>
                              <span
                                className="tag-badge"
                                style={{
                                  background: `${tag.color}20`,
                                  color: tag.color,
                                  border: `1px solid ${tag.color}40`
                                }}
                              >
                                {tag.name}
                              </span>
                            </td>
                            <td>{tag.totalTrades}</td>
                            <td className={tag.winRate >= 50 ? 'positive' : 'negative'}>{tag.winRate}%</td>
                            <td className={tag.avgR >= 0 ? 'positive' : 'negative'}>{tag.avgR}R</td>
                            <td className={tag.profitFactor >= 1 ? 'positive' : 'negative'}>{tag.profitFactor}</td>
                            <td className={tag.totalPnl >= 0 ? 'positive' : 'negative'}>${tag.totalPnl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mistake Tags Performance */}
              {tagAnalysis.mistakeTags && tagAnalysis.mistakeTags.length > 0 && (
                <div className="section">
                  <div className="section-title">❌ Mistake Impact</div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Mistake</th>
                          <th>Occurrences</th>
                          <th>Win Rate</th>
                          <th>Avg R</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tagAnalysis.mistakeTags.map(tag => (
                          <tr key={tag.id}>
                            <td>
                              <span
                                className="tag-badge"
                                style={{
                                  background: `${tag.color}20`,
                                  color: tag.color,
                                  border: `1px solid ${tag.color}40`
                                }}
                              >
                                {tag.name}
                              </span>
                            </td>
                            <td>{tag.totalTrades}</td>
                            <td className={tag.winRate >= 50 ? 'positive' : 'negative'}>{tag.winRate}%</td>
                            <td className={tag.avgR >= 0 ? 'positive' : 'negative'}>{tag.avgR}R</td>
                            <td className={tag.totalPnl >= 0 ? 'positive' : 'negative'}>${tag.totalPnl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="insight-box">
                    💡 Trades tagged with mistakes cost you ${Math.abs(tagAnalysis.mistakeTags.reduce((sum, t) => sum + Math.min(0, t.totalPnl), 0))} total.
                    Focus on eliminating your most costly mistake to improve your edge.
                  </div>
                </div>
              )}

              {/* Emotion Tags Performance */}
              {tagAnalysis.emotionTags && tagAnalysis.emotionTags.length > 0 && (
                <div className="section">
                  <div className="section-title">😤 Emotional State Impact</div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Emotion</th>
                          <th>Trades</th>
                          <th>Win Rate</th>
                          <th>Avg R</th>
                          <th>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tagAnalysis.emotionTags.map(tag => (
                          <tr key={tag.id}>
                            <td>
                              <span
                                className="tag-badge"
                                style={{
                                  background: `${tag.color}20`,
                                  color: tag.color,
                                  border: `1px solid ${tag.color}40`
                                }}
                              >
                                {tag.name}
                              </span>
                            </td>
                            <td>{tag.totalTrades}</td>
                            <td className={tag.winRate >= 50 ? 'positive' : 'negative'}>{tag.winRate}%</td>
                            <td className={tag.avgR >= 0 ? 'positive' : 'negative'}>{tag.avgR}R</td>
                            <td className={tag.totalPnl >= 0 ? 'positive' : 'negative'}>${tag.totalPnl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Most Used Tags */}
              {tagAnalysis.mostUsedTags && tagAnalysis.mostUsedTags.length > 0 && (
                <div className="section">
                  <div className="section-title">📊 Most Used Tags</div>
                  <div className="tag-grid">
                    {tagAnalysis.mostUsedTags.map(tag => (
                      <div key={tag.id} className="tag-card">
                        <div className="tag-header">
                          <span
                            className="tag-badge"
                            style={{
                              background: `${tag.color}20`,
                              color: tag.color,
                              border: `1px solid ${tag.color}40`
                            }}
                          >
                            {tag.name}
                          </span>
                          <span className="tag-category">{tag.category}</span>
                        </div>
                        <div className="tag-stats">
                          <div className="tag-stat">
                            <div className="tag-stat-label">Trades</div>
                            <div className="tag-stat-value">{tag.totalTrades}</div>
                          </div>
                          <div className="tag-stat">
                            <div className="tag-stat-label">Win Rate</div>
                            <div className={`tag-stat-value ${tag.winRate >= 50 ? 'positive' : 'negative'}`}>{tag.winRate}%</div>
                          </div>
                          <div className="tag-stat">
                            <div className="tag-stat-label">Avg R</div>
                            <div className={`tag-stat-value ${tag.avgR >= 0 ? 'positive' : 'negative'}`}>{tag.avgR}R</div>
                          </div>
                          <div className="tag-stat">
                            <div className="tag-stat-label">Total P&L</div>
                            <div className={`tag-stat-value ${tag.totalPnl >= 0 ? 'positive' : 'negative'}`}>${tag.totalPnl}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="section">
              <div className="section-title">🏷️ Tag Performance</div>
              <div className="no-data">
                <p style={{ marginBottom: '12px' }}>No tagged trades found.</p>
                <p style={{ fontSize: '0.85rem' }}>
                  Add tags to your trades in the Trade Entry form to see performance by setup, mistake, and emotional state.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* MAE/MFE Tab */}
      {activeTab === 'mae-mfe' && (
        <div className="analysis-grid">
          {maeAnalysis ? (
            <div className="analysis-card">
              <div className="analysis-title">📉 MAE Analysis (Max Adverse Excursion)</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '16px' }}>
                How far trades move against you before closing
              </p>
              <div className="analysis-stat">
                <span className="analysis-stat-label">Average MAE</span>
                <span className="analysis-stat-value negative">{maeAnalysis.avgMAE}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">MAE on Winners</span>
                <span className="analysis-stat-value">{maeAnalysis.avgMAEWins}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">MAE on Losers</span>
                <span className="analysis-stat-value">{maeAnalysis.avgMAELosses}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">Potential Saves</span>
                <span className="analysis-stat-value">{maeAnalysis.potentialSaves} trades</span>
              </div>
              <div className="insight-box">
                💡 {maeAnalysis.insight}
              </div>
              {maeAnalysis.distribution && (
                <div className="distribution-chart">
                  {maeAnalysis.distribution.map((d, i) => (
                    <div
                      key={i}
                      className="distribution-bar"
                      style={{
                        height: `${Math.max(10, (d.count / Math.max(...maeAnalysis.distribution.map(x => x.count))) * 100)}%`,
                      }}
                    >
                      <span className="distribution-label">{d.range}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="analysis-card">
              <div className="analysis-title">📉 MAE Analysis</div>
              <div className="no-data">No MAE data available. Add max_adverse_excursion to your trades.</div>
            </div>
          )}

          {mfeAnalysis ? (
            <div className="analysis-card">
              <div className="analysis-title">📈 MFE Analysis (Max Favorable Excursion)</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '16px' }}>
                How far trades move in your favor before closing
              </p>
              <div className="analysis-stat">
                <span className="analysis-stat-label">Average MFE</span>
                <span className="analysis-stat-value positive">{mfeAnalysis.avgMFE}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">MFE on Winners</span>
                <span className="analysis-stat-value">{mfeAnalysis.avgMFEWins}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">MFE on Losers</span>
                <span className="analysis-stat-value">{mfeAnalysis.avgMFELosses}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">Profit Capture Rate</span>
                <span className="analysis-stat-value">{mfeAnalysis.avgCaptureRatio}%</span>
              </div>
              <div className="analysis-stat">
                <span className="analysis-stat-label">Left Profit on Table</span>
                <span className="analysis-stat-value">{mfeAnalysis.tradesLeftOnTable} trades</span>
              </div>
              <div className="insight-box">
                💡 {mfeAnalysis.insight}
              </div>
            </div>
          ) : (
            <div className="analysis-card">
              <div className="analysis-title">📈 MFE Analysis</div>
              <div className="no-data">No MFE data available. Add max_favorable_excursion to your trades.</div>
            </div>
          )}
        </div>
      )}

      {/* Time Analysis Tab */}
      {activeTab === 'time' && (
        <>
          {timeAnalysis ? (
            <div className="section">
              <div className="section-title">⏱️ Holding Time Analysis</div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Avg Holding Time</div>
                  <div className="stat-value">{timeAnalysis.avgHoldingTime}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Time (Winners)</div>
                  <div className="stat-value positive">{timeAnalysis.avgTimeWins}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Time (Losers)</div>
                  <div className="stat-value negative">{timeAnalysis.avgTimeLosses}</div>
                </div>
              </div>
              <div className="insight-box">
                💡 {timeAnalysis.insight}
              </div>
            </div>
          ) : (
            <div className="section">
              <div className="section-title">⏱️ Holding Time Analysis</div>
              <div className="no-data">No holding time data available. Ensure trades have entry and exit dates.</div>
            </div>
          )}
        </>
      )}

      {/* Performance History Tab */}
      {activeTab === 'performance' && (
        <>
          {/* Monthly Performance */}
          {monthlyPerformance && monthlyPerformance.length > 0 && (
            <div className="section">
              <div className="section-title">📅 Monthly Performance</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyPerformance.map((m, i) => (
                      <tr key={i}>
                        <td>{m.month}</td>
                        <td>{m.trades}</td>
                        <td className={m.winRate >= 50 ? 'positive' : 'negative'}>{m.winRate}%</td>
                        <td className={m.pnl >= 0 ? 'positive' : 'negative'}>${m.pnl.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weekly Performance */}
          {weeklyPerformance && weeklyPerformance.length > 0 && (
            <div className="section">
              <div className="section-title">📊 Weekly Performance (Last 12 Weeks)</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Week Starting</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyPerformance.map((w, i) => (
                      <tr key={i}>
                        <td>{w.week}</td>
                        <td>{w.trades}</td>
                        <td className={w.winRate >= 50 ? 'positive' : 'negative'}>{w.winRate}%</td>
                        <td className={w.pnl >= 0 ? 'positive' : 'negative'}>${w.pnl.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Equity Curve & Drawdown */}
          {equityCurve && equityCurve.curve && equityCurve.curve.length > 0 && (
            <>
              {/* Drawdown Stats */}
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <div className="stat-label">Max Drawdown</div>
                  <div className="stat-value negative">${equityCurve.stats.maxDrawdown}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Max DD %</div>
                  <div className="stat-value negative">{equityCurve.stats.maxDrawdownPct}%</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Current Drawdown</div>
                  <div className={`stat-value ${equityCurve.stats.currentDrawdown > 0 ? 'negative' : 'positive'}`}>
                    ${equityCurve.stats.currentDrawdown}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Peak Equity</div>
                  <div className="stat-value positive">${equityCurve.stats.peak}</div>
                </div>
              </div>

              {/* Equity Curve Chart */}
              <div className="section">
                <div className="section-title">📈 Equity Curve</div>
                <div className="equity-chart">
                  {equityCurve.curve.slice(-50).map((point, i) => {
                    const dataSlice = equityCurve.curve.slice(-50);
                    const max = Math.max(...dataSlice.map(p => Math.abs(p.pnl)), 1);
                    const height = (Math.abs(point.pnl) / max) * 100;
                    return (
                      <div
                        key={i}
                        className="equity-bar"
                        style={{
                          height: `${Math.max(5, height)}%`,
                          background: point.pnl >= 0 ? '#10b981' : '#ef4444',
                        }}
                        title={`${point.date}: $${point.pnl}`}
                      />
                    );
                  })}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center' }}>
                  Last 50 trades • Current Equity: ${equityCurve.stats.currentEquity}
                </p>
              </div>

              {/* Drawdown Chart */}
              <div className="section">
                <div className="section-title">📉 Drawdown Chart</div>
                <div className="equity-chart">
                  {equityCurve.curve.slice(-50).map((point, i) => {
                    const dataSlice = equityCurve.curve.slice(-50);
                    const maxDD = Math.max(...dataSlice.map(p => p.drawdown), 1);
                    const height = (point.drawdown / maxDD) * 100;
                    return (
                      <div
                        key={i}
                        className="equity-bar"
                        style={{
                          height: `${Math.max(2, height)}%`,
                          background: point.drawdown > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.3)',
                        }}
                        title={`${point.date}: -$${point.drawdown} (${point.drawdownPct}%)`}
                      />
                    );
                  })}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center' }}>
                  Drawdown from peak equity • Max: ${equityCurve.stats.maxDrawdown} ({equityCurve.stats.maxDrawdownPct}%)
                </p>
              </div>
            </>
          )}
        </>
      )}
    </JournalLayout>
  );
}

export async function getServerSideProps({ req }) {
  try {
    const journalUser = await getJournalUser(req);
    if (!journalUser) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    return {
      props: {
        user: {
          id: journalUser.id,
          email: journalUser.email,
          fullName: journalUser.full_name || null,
        },
        settings: {
          account_size: journalUser.account_size,
          base_currency: journalUser.base_currency,
          default_risk_percent: journalUser.default_risk_percent,
          timezone: journalUser.timezone,
        },
      },
    };
  } catch (err) {
    console.error('Analytics page error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}
