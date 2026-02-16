import { useState } from 'react';
import JournalLayout from '../../components/journal/JournalLayout';
import { getJournalUser, checkJournalAccess } from '../../lib/journalAuth';

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
    return { props: { user: JSON.parse(JSON.stringify(user)) } };
  } catch {
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trades', label: 'Trades' },
  { id: 'import', label: 'Import CSV' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'charts', label: 'Charts' },
  { id: 'goals', label: 'Goals' },
  { id: 'playbook', label: 'Playbook' },
  { id: 'ai-coach', label: 'AI Coach' },
  { id: 'calculators', label: 'Calculators' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'share', label: 'Share' },
  { id: 'popular', label: 'Popular Investors' },
  { id: 'settings', label: 'Settings' },
  { id: 'glossary', label: 'Glossary' },
];

export default function GuidePage({ user }) {
  const [activeSection, setActiveSection] = useState('overview');

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <JournalLayout user={user} title="User Guide">
      <style jsx>{`
        .guide-layout {
          display: flex;
          gap: 30px;
          align-items: flex-start;
        }

        /* Table of Contents sidebar */
        .toc {
          position: sticky;
          top: 20px;
          width: 180px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px 0;
        }
        .toc-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,0.4);
          padding: 0 16px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 6px;
        }
        .toc-item {
          display: block;
          padding: 7px 16px;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.55);
          cursor: pointer;
          transition: all 0.15s;
          border-left: 2px solid transparent;
        }
        .toc-item:hover {
          color: white;
          background: rgba(255,255,255,0.04);
        }
        .toc-item.active {
          color: #a78bfa;
          border-left-color: #a78bfa;
          background: rgba(167,139,250,0.06);
        }

        /* Main content */
        .guide-content {
          flex: 1;
          min-width: 0;
        }

        /* Page header */
        .guide-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 40px 30px;
          background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15));
          border: 1px solid rgba(102,126,234,0.2);
          border-radius: 16px;
        }
        .guide-header h1 {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a78bfa, #667eea, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }
        .guide-header p {
          color: rgba(255,255,255,0.6);
          font-size: 1.05rem;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Section */
        .section {
          margin-bottom: 36px;
          scroll-margin-top: 20px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .section-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .section-header h2 {
          font-size: 1.45rem;
          font-weight: 700;
          color: white;
        }
        .section-header .section-subtitle {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.45);
          margin-top: 2px;
        }

        /* Card grid */
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        /* Feature card */
        .feature-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }
        .feature-card:hover {
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
        }
        .feature-card h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feature-card p {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.55;
        }

        /* Info box */
        .info-box {
          padding: 18px 22px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.88rem;
          line-height: 1.6;
        }
        .info-box.blue {
          background: rgba(59,130,246,0.08);
          border: 1px solid rgba(59,130,246,0.2);
          color: #93c5fd;
        }
        .info-box.green {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          color: #6ee7b7;
        }
        .info-box.purple {
          background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.2);
          color: #c4b5fd;
        }
        .info-box.amber {
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          color: #fcd34d;
        }
        .info-box strong {
          color: white;
        }
        .info-box-title {
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
          font-size: 0.92rem;
        }

        /* Step list */
        .step-list {
          list-style: none;
          padding: 0;
          margin: 0 0 16px;
        }
        .step-list li {
          display: flex;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.88rem;
          color: rgba(255,255,255,0.65);
          line-height: 1.5;
        }
        .step-list li:last-child { border-bottom: none; }
        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* Metric definition */
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }
        .metric-def {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 16px 18px;
        }
        .metric-def h4 {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .metric-def p {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
        }
        .metric-def .formula {
          display: inline-block;
          margin-top: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.78rem;
          color: #a78bfa;
        }

        /* Broker badges */
        .broker-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .broker-badge {
          padding: 6px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.7);
        }

        /* Calculator tab cards */
        .calc-tab-label {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .calc-tab-label.pre-trade { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .calc-tab-label.technical { background: rgba(16,185,129,0.15); color: #34d399; }
        .calc-tab-label.fundamental { background: rgba(245,158,11,0.15); color: #fbbf24; }

        /* Paragraph */
        .desc {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.65;
          margin-bottom: 18px;
        }

        @media (max-width: 900px) {
          .guide-layout { flex-direction: column; }
          .toc {
            position: static;
            width: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 0;
            padding: 10px;
          }
          .toc-title { display: none; }
          .toc-item {
            padding: 6px 12px;
            border-left: none;
            border-radius: 6px;
            font-size: 0.78rem;
          }
          .toc-item.active {
            background: rgba(167,139,250,0.15);
            border-left: none;
          }
          .card-grid { grid-template-columns: 1fr; }
          .metric-grid { grid-template-columns: 1fr; }
          .guide-header { padding: 24px 18px; }
          .guide-header h1 { font-size: 1.5rem; }
        }
      `}</style>

      <div className="guide-layout">
        {/* Table of Contents */}
        <div className="toc">
          <div className="toc-title">Contents</div>
          {sections.map((s) => (
            <div
              key={s.id}
              className={`toc-item${activeSection === s.id ? ' active' : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="guide-content">
          <div className="guide-header">
            <h1>Trading Journal User Guide</h1>
            <p>
              Everything you need to know about using your Market Warrior Trading Journal.
              From logging your first trade to mastering advanced analytics.
            </p>
          </div>

          {/* ─── OVERVIEW ──────────────────────────────── */}
          <div className="section" id="overview">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(102,126,234,0.15)' }}>
                <span style={{ color: '#667eea' }}>&#9733;</span>
              </div>
              <div>
                <h2>Overview</h2>
                <div className="section-subtitle">What is the Market Warrior Trading Journal?</div>
              </div>
            </div>

            <p className="desc">
              The Market Warrior Trading Journal is a professional-grade trading journal designed to help you track,
              analyse, and improve your trading. It combines trade logging, performance analytics, risk management
              tools, and an AI-powered coach to help you become a more consistent and disciplined trader.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#60a5fa' }}>&#9881;</span> Track Every Trade</h4>
                <p>Log trades manually or bulk import from your broker. Capture entries, exits, P&amp;L, notes, and emotions all in one place.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#9889;</span> Analyse Performance</h4>
                <p>Detailed analytics, charts, and metrics reveal patterns in your trading: what works, what doesn't, and where to improve.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#a78bfa' }}>&#129302;</span> AI Trading Coach</h4>
                <p>Get personalised insights and advice from an AI that has access to your full trade history and performance data.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#fbbf24' }}>&#127942;</span> Build Discipline</h4>
                <p>Set trading rules, track rule violations, define goals, and maintain a consistency streak with the Challenge system.</p>
              </div>
            </div>
          </div>

          {/* ─── DASHBOARD ─────────────────────────────── */}
          <div className="section" id="dashboard">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <span style={{ color: '#3b82f6' }}>&#9783;</span>
              </div>
              <div>
                <h2>Dashboard (Command Center)</h2>
                <div className="section-subtitle">Your daily trading HQ</div>
              </div>
            </div>

            <p className="desc">
              The Dashboard is your home screen. It provides an at-a-glance overview of your trading performance
              with key metrics, today's activity, and recent trades.
            </p>

            <div className="info-box blue">
              <div className="info-box-title">Time Period Filter</div>
              Use the buttons in the top-right corner (<strong>7d</strong>, <strong>30d</strong>, <strong>90d</strong>,
              <strong> YTD</strong>, <strong>All Time</strong>) to change the date range for all metrics.
              <strong> YTD</strong> shows trades from January 1st of the current year to today.
              If your imported trades are from a previous year, use <strong>All Time</strong> or <strong>90d</strong> to see them.
            </div>

            <h3 style={{ color: 'white', fontSize: '1.05rem', marginBottom: '14px' }}>Key Metrics Explained</h3>
            <div className="metric-grid">
              <div className="metric-def">
                <h4 style={{ color: '#60a5fa' }}>Total P&amp;L</h4>
                <p>Your total profit or loss across all closed trades in the selected period. Green = profit, red = loss.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#34d399' }}>Win Rate</h4>
                <p>Percentage of your closed trades that were profitable.</p>
                <span className="formula">Winning Trades / Total Trades &times; 100</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#a78bfa' }}>Profit Factor</h4>
                <p>Ratio of gross profits to gross losses. Above 1.0 means you're profitable overall. Above 2.0 is very good.</p>
                <span className="formula">Gross Profit / Gross Loss</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#fbbf24' }}>Avg R-Multiple</h4>
                <p>Average profit or loss measured in units of risk (R). Requires a stop loss on your trades to calculate risk.
                  A positive R means you're making more than you risk on average.</p>
                <span className="formula">P&amp;L / Initial Risk Amount</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#f87171' }}>Max Drawdown</h4>
                <p>The largest peak-to-trough decline in your cumulative P&amp;L. Shows your worst losing streak in dollar terms.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#c084fc' }}>Consistency Score</h4>
                <p>A score from 0-100 measuring how consistent your trading is. Based on win rate, profit factor, profit distribution, and sample size.</p>
              </div>
            </div>

            <div className="info-box green">
              <div className="info-box-title">Today's Activity</div>
              The top banner shows today's trades entered, trades closed, closed P&amp;L, and open positions.
              Quick links let you add a new trade, view all trades, or go to analytics.
            </div>
          </div>

          {/* ─── TRADES ────────────────────────────────── */}
          <div className="section" id="trades">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <span style={{ color: '#10b981' }}>&#9776;</span>
              </div>
              <div>
                <h2>Trades</h2>
                <div className="section-subtitle">Log, view, and manage all your trades</div>
              </div>
            </div>

            <p className="desc">
              The Trades section is where all your trades live. You can view your full trade history,
              filter and sort, add new trades manually, or edit existing ones.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>+</span> Add Trade</h4>
                <p>Manually enter a trade with symbol, direction (long/short), entry/exit prices, dates, quantity, stop loss, take profit, and notes. P&amp;L is auto-calculated.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#60a5fa' }}>&#9998;</span> Edit Trade</h4>
                <p>Click any trade to edit its details. Update prices, add exit info to close an open trade, add notes, or change the strategy tag.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#fbbf24' }}>&#128269;</span> Filter &amp; Sort</h4>
                <p>Filter by status (open/closed), direction (long/short), symbol, or date range. Sort by date, symbol, P&amp;L, and more.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#f87171' }}>&#128465;</span> Delete Trade</h4>
                <p>Remove trades you no longer need. A confirmation prompt prevents accidental deletion.</p>
              </div>
            </div>

            <div className="info-box amber">
              <div className="info-box-title">Required Fields</div>
              Only <strong>Symbol</strong> and <strong>Entry Price</strong> are mandatory when adding a trade.
              Everything else (direction, dates, quantity, stop loss, etc.) is optional and will use smart defaults.
            </div>
          </div>

          {/* ─── IMPORT CSV ────────────────────────────── */}
          <div className="section" id="import">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <span style={{ color: '#f59e0b' }}>&#128228;</span>
              </div>
              <div>
                <h2>Import CSV</h2>
                <div className="section-subtitle">Bulk import trades from your broker</div>
              </div>
            </div>

            <p className="desc">
              Import your trade history in seconds instead of entering trades one by one. We support
              CSV exports from popular brokers with automatic column mapping.
            </p>

            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '12px' }}>Supported Brokers &amp; Platforms</h3>
            <div className="broker-badges">
              <span className="broker-badge">eToro</span>
              <span className="broker-badge">Trading 212</span>
              <span className="broker-badge">Robinhood</span>
              <span className="broker-badge">Interactive Brokers</span>
              <span className="broker-badge">TradingView</span>
              <span className="broker-badge">MT4 / MT5</span>
              <span className="broker-badge">ThinkOrSwim</span>
              <span className="broker-badge">Generic CSV</span>
            </div>

            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '12px' }}>How to Import</h3>
            <ul className="step-list">
              <li>
                <span className="step-num">1</span>
                <span>Export your trade history as a CSV file from your broker. For <strong>eToro</strong>, go to Account Statement &rarr; Closed Positions tab &rarr; Export as CSV (MS-DOS). For <strong>Trading 212</strong>, go to History &rarr; Export CSV.</span>
              </li>
              <li>
                <span className="step-num">2</span>
                <span>On the Import page, select your broker from the <strong>Format</strong> dropdown. This tells the system how to read your columns.</span>
              </li>
              <li>
                <span className="step-num">3</span>
                <span>Upload your CSV file. You'll see a <strong>preview</strong> of the first few rows so you can verify the data looks correct.</span>
              </li>
              <li>
                <span className="step-num">4</span>
                <span>Click <strong>Import Trades</strong>. The system will parse each row, validate the data, and insert valid trades into your journal.</span>
              </li>
              <li>
                <span className="step-num">5</span>
                <span>Review the results: you'll see how many trades were imported, how many were skipped, and any row-level errors.</span>
              </li>
            </ul>

            <div className="info-box purple">
              <div className="info-box-title">Generic CSV</div>
              If your broker isn't listed, choose <strong>Generic CSV</strong>. You'll get a column mapping
              interface where you can manually tell the system which CSV column maps to which trade field
              (symbol, price, date, etc.). The system also auto-detects common column names.
            </div>
          </div>

          {/* ─── ANALYTICS ─────────────────────────────── */}
          <div className="section" id="analytics">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <span style={{ color: '#8b5cf6' }}>&#128200;</span>
              </div>
              <div>
                <h2>Analytics</h2>
                <div className="section-subtitle">Deep-dive into your trading performance</div>
              </div>
            </div>

            <p className="desc">
              The Analytics page gives you a comprehensive statistical breakdown of your trading. Use it to
              identify strengths, weaknesses, and patterns you might not notice otherwise.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#a78bfa' }}>&#128202;</span> Performance Breakdown</h4>
                <p>See winning vs losing trades, average win/loss, largest win/loss, expectancy, and profit factor across any time period.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#60a5fa' }}>&#128197;</span> By Symbol / Strategy</h4>
                <p>Break down performance by individual tickers, strategies, or trading sessions. Find out which symbols you trade best.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#128336;</span> By Day &amp; Time</h4>
                <p>Discover which days of the week and times of day you perform best. Helps you optimise your trading schedule.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#fbbf24' }}>&#128176;</span> Expectancy</h4>
                <p>Your expected profit per trade based on your win rate and average win/loss. Positive expectancy = an edge.</p>
              </div>
            </div>
          </div>

          {/* ─── CHARTS ────────────────────────────────── */}
          <div className="section" id="charts">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
                <span style={{ color: '#06b6d4' }}>&#128208;</span>
              </div>
              <div>
                <h2>Charts</h2>
                <div className="section-subtitle">Visualise your trading journey</div>
              </div>
            </div>

            <p className="desc">
              Interactive charts let you visualise your equity curve, P&amp;L trends, drawdowns, and more. Use these to
              see the big picture of your trading progress over time.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#06b6d4' }}>&#128200;</span> Equity Curve</h4>
                <p>Your cumulative P&amp;L over time. A rising line means consistent profitability. Dips show drawdown periods.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#f87171' }}>&#128201;</span> Drawdown Chart</h4>
                <p>Visualises how far your equity dropped from its peak at any point. Helps assess risk and recovery periods.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#128202;</span> Win Rate Over Time</h4>
                <p>Track whether your win rate is improving, declining, or staying steady as you gain experience.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#fbbf24' }}>&#128506;</span> Monthly Heatmap</h4>
                <p>See your P&amp;L performance for each month in a colour-coded grid. Green months = profit, red months = loss.</p>
              </div>
            </div>
          </div>

          {/* ─── GOALS ─────────────────────────────────── */}
          <div className="section" id="goals">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <span style={{ color: '#10b981' }}>&#127919;</span>
              </div>
              <div>
                <h2>Goals</h2>
                <div className="section-subtitle">Set targets and track your progress</div>
              </div>
            </div>

            <p className="desc">
              Set trading goals to keep yourself accountable. Whether it's a profit target, a win rate to maintain,
              or a number of trades to take, the Goals page tracks your progress automatically.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#10b981' }}>&#128176;</span> Profit Target</h4>
                <p>Set a dollar amount you want to make in a given period. The progress bar fills as you approach your target.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#3b82f6' }}>&#127942;</span> Win Rate Goal</h4>
                <p>Aim for a specific win rate percentage. Great for focusing on trade quality over quantity.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#f59e0b' }}>&#128203;</span> Trade Count</h4>
                <p>Track how many trades you take. Useful if you want to trade more (or less!) frequently.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#a78bfa' }}>&#128736;</span> Custom Goals</h4>
                <p>Create any goal with a custom name, target value, deadline, and priority level.</p>
              </div>
            </div>
          </div>

          {/* ─── PLAYBOOK ──────────────────────────────── */}
          <div className="section" id="playbook">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <span style={{ color: '#f97316' }}>&#128214;</span>
              </div>
              <div>
                <h2>Playbook</h2>
                <div className="section-subtitle">Document your trading strategies</div>
              </div>
            </div>

            <p className="desc">
              Your Playbook is where you document your trading strategies, setups, and rules. Think of it as
              a personal trading manual that you refine over time as you learn what works for you.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#f97316' }}>&#128221;</span> Strategy Documentation</h4>
                <p>For each strategy, document: entry rules, exit rules, stop loss rules, position sizing, and the market conditions where it works best.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#128202;</span> Strategy Performance</h4>
                <p>See how each strategy performs: total trades, win rate, average P&amp;L, and profit factor. Know which setups are your bread and butter.</p>
              </div>
            </div>

            <div className="info-box green">
              <div className="info-box-title">Pro Tip</div>
              When adding trades, tag them with your strategy name. The Playbook will automatically aggregate
              performance stats for each strategy based on your tagged trades.
            </div>
          </div>

          {/* ─── AI COACH ──────────────────────────────── */}
          <div className="section" id="ai-coach">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(167,139,250,0.15)' }}>
                <span style={{ color: '#a78bfa' }}>&#129302;</span>
              </div>
              <div>
                <h2>AI Coach</h2>
                <div className="section-subtitle">Your personal AI trading mentor</div>
              </div>
            </div>

            <p className="desc">
              The AI Coach analyses your trade history and provides personalised insights, advice, and pattern recognition.
              Ask it anything about your trading performance.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#a78bfa' }}>&#128172;</span> Chat Interface</h4>
                <p>Have a conversation with your AI coach. Ask questions like "Why am I losing on Mondays?" or "Analyse my last 10 trades."</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#60a5fa' }}>&#9889;</span> Quick Prompts</h4>
                <p>Use pre-built prompts like "Analyse my performance", "Find patterns in my losses", or "Suggest improvements" to get started quickly.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#128161;</span> Personalised Insights</h4>
                <p>The AI has access to your full trade data. Its advice is based on YOUR actual trading patterns, not generic tips.</p>
              </div>
            </div>

            <div className="info-box purple">
              <div className="info-box-title">Usage Limit</div>
              The AI Coach allows up to <strong>10 messages per day</strong>. This resets every 24 hours.
              Make your questions count by being specific about what you want to know.
            </div>
          </div>

          {/* ─── CALCULATORS ───────────────────────────── */}
          <div className="section" id="calculators">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(236,72,153,0.15)' }}>
                <span style={{ color: '#ec4899' }}>&#128290;</span>
              </div>
              <div>
                <h2>Calculators</h2>
                <div className="section-subtitle">Essential trading calculation tools</div>
              </div>
            </div>

            <p className="desc">
              A collection of calculators organised into three tabs: Pre-Trade (before you enter), Technical (chart levels),
              and Fundamental (valuations). All calculations update in real-time as you type.
            </p>

            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '14px' }}>Pre-Trade</h3>
            <div className="card-grid">
              <div className="feature-card">
                <span className="calc-tab-label pre-trade">Pre-Trade</span>
                <h4>Position Size Calculator</h4>
                <p>Enter your account size, risk %, entry price, and stop loss to get the exact number of shares/units to buy.</p>
              </div>
              <div className="feature-card">
                <span className="calc-tab-label pre-trade">Pre-Trade</span>
                <h4>Risk-Reward Calculator</h4>
                <p>Enter your entry, stop loss, and take profit to see your risk:reward ratio and expected value.</p>
              </div>
              <div className="feature-card">
                <span className="calc-tab-label pre-trade">Pre-Trade</span>
                <h4>Leverage Calculator</h4>
                <p>See the impact of leverage on your position: actual value, P&amp;L at a given move, and liquidation price.</p>
              </div>
            </div>

            <h3 style={{ color: 'white', fontSize: '1rem', margin: '6px 0 14px' }}>Technical</h3>
            <div className="card-grid">
              <div className="feature-card">
                <span className="calc-tab-label technical">Technical</span>
                <h4>Support &amp; Resistance (Pivot Points)</h4>
                <p>Enter previous high, low, close to get pivot point, support (S1-S3) and resistance (R1-R3) levels using Standard, Fibonacci, or Camarilla methods.</p>
              </div>
              <div className="feature-card">
                <span className="calc-tab-label technical">Technical</span>
                <h4>Fibonacci Retracement</h4>
                <p>Enter a swing high and low to get key Fibonacci levels: 23.6%, 38.2%, 50%, 61.8%, and 78.6%.</p>
              </div>
              <div className="feature-card">
                <span className="calc-tab-label technical">Technical</span>
                <h4>Moving Average &amp; RSI</h4>
                <p>Calculate SMA/EMA values and RSI for any price data. See overbought/oversold zones.</p>
              </div>
            </div>

            <h3 style={{ color: 'white', fontSize: '1rem', margin: '6px 0 14px' }}>Fundamental</h3>
            <div className="card-grid">
              <div className="feature-card">
                <span className="calc-tab-label fundamental">Fundamental</span>
                <h4>ROI Calculator</h4>
                <p>Calculate return on investment, total return, and annualised return from initial and final values.</p>
              </div>
              <div className="feature-card">
                <span className="calc-tab-label fundamental">Fundamental</span>
                <h4>P/E Ratio Calculator</h4>
                <p>Enter stock price and earnings per share to get the P/E ratio and a valuation assessment.</p>
              </div>
            </div>
          </div>

          {/* ─── CHALLENGE ─────────────────────────────── */}
          <div className="section" id="challenge">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <span style={{ color: '#ef4444' }}>&#128293;</span>
              </div>
              <div>
                <h2>Challenge</h2>
                <div className="section-subtitle">Build trading discipline with rules and accountability</div>
              </div>
            </div>

            <p className="desc">
              The Challenge system helps you build discipline by defining trading rules and tracking violations.
              Set strict limits on daily loss, trade count, risk per trade, and more.
            </p>

            <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '12px' }}>Available Rule Types</h3>
            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#f87171' }}>&#128176;</span> Max Daily Loss</h4>
                <p>Set a dollar or percentage limit for maximum daily loss. Stop trading when you hit the limit.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#fbbf24' }}>&#128203;</span> Max Trades Per Day</h4>
                <p>Limit the number of trades you take each day to prevent overtrading.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#60a5fa' }}>&#128737;</span> Required Stop Loss</h4>
                <p>Enforce that every trade must have a stop loss before entry. No exceptions.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#128209;</span> Custom Rules</h4>
                <p>Create any rule with a custom description. Great for personal rules like "No trading during news events."</p>
              </div>
            </div>

            <div className="info-box amber">
              <div className="info-box-title">Daily Report Card</div>
              At the end of each trading day, fill out the Daily Report Card to score your discipline,
              note what went well and what needs improvement. This feeds into your Consistency Score
              and helps you build a streak of disciplined trading days.
            </div>
          </div>

          {/* ─── SHARE ─────────────────────────────────── */}
          <div className="section" id="share">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(236,72,153,0.15)' }}>
                <span style={{ color: '#ec4899' }}>&#128247;</span>
              </div>
              <div>
                <h2>Share</h2>
                <div className="section-subtitle">Generate social media performance cards</div>
              </div>
            </div>

            <p className="desc">
              Create beautiful, professional performance cards to share your trading wins on social media.
              Choose from daily, weekly, monthly, streak, and milestone templates.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#ec4899' }}>&#127912;</span> Card Templates</h4>
                <p>5 templates: Daily Performance, Weekly Summary, Monthly Recap, Win Streak, and Milestone. Each auto-populates with your real data.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#a78bfa' }}>&#127752;</span> Customise &amp; Download</h4>
                <p>Choose gradient backgrounds, customise text, add hashtags, and download as a PNG image ready for Twitter, Instagram, or Discord.</p>
              </div>
            </div>
          </div>

          {/* ─── POPULAR INVESTORS ─────────────────────── */}
          <div className="section" id="popular">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <span style={{ color: '#22c55e' }}>&#128101;</span>
              </div>
              <div>
                <h2>Popular Investors</h2>
                <div className="section-subtitle">Discover top traders to learn from</div>
              </div>
            </div>

            <p className="desc">
              Browse top eToro traders, filtered by performance, risk level, and consistency.
              See their gains, copier count, risk scores, and top traded instruments.
              Use this to discover trading styles and strategies that work.
            </p>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#22c55e' }}>&#128269;</span> Filter &amp; Sort</h4>
                <p>Filter by time period, risk level (low/medium/high), and sort by gain, copiers, risk, win rate, or consistency.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#3b82f6' }}>&#128100;</span> Trader Profiles</h4>
                <p>Each card shows gain %, copier count, risk score, win rate, and top instruments. Click through to view full profiles.</p>
              </div>
            </div>
          </div>

          {/* ─── SETTINGS ──────────────────────────────── */}
          <div className="section" id="settings">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(107,114,128,0.15)' }}>
                <span style={{ color: '#9ca3af' }}>&#9881;</span>
              </div>
              <div>
                <h2>Settings</h2>
                <div className="section-subtitle">Configure your journal preferences</div>
              </div>
            </div>

            <div className="card-grid">
              <div className="feature-card">
                <h4><span style={{ color: '#60a5fa' }}>&#128176;</span> Account Size</h4>
                <p>Set your total trading account size. Used by the Position Size Calculator and risk calculations throughout the journal.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#34d399' }}>&#128177;</span> Base Currency</h4>
                <p>Choose your account currency (USD, EUR, GBP, etc.). P&amp;L and monetary values are displayed in this currency.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#fbbf24' }}>&#9878;</span> Default Risk %</h4>
                <p>Set your default risk per trade (e.g. 1%). Pre-fills the risk field when adding new trades.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#a78bfa' }}>&#128337;</span> Trading Sessions</h4>
                <p>Define custom trading session labels (e.g. London, New York, Asia). These appear when tagging trades.</p>
              </div>
              <div className="feature-card">
                <h4><span style={{ color: '#9ca3af' }}>&#128065;</span> Display Preferences</h4>
                <p>Toggle R-multiples and dollar amounts on or off depending on what you want to see in your trade lists.</p>
              </div>
            </div>
          </div>

          {/* ─── GLOSSARY ──────────────────────────────── */}
          <div className="section" id="glossary">
            <div className="section-header">
              <div className="section-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <span style={{ color: '#6366f1' }}>&#128218;</span>
              </div>
              <div>
                <h2>Glossary</h2>
                <div className="section-subtitle">Key trading terms explained</div>
              </div>
            </div>

            <div className="metric-grid">
              <div className="metric-def">
                <h4 style={{ color: '#60a5fa' }}>P&amp;L (Profit &amp; Loss)</h4>
                <p>The financial result of a trade. Calculated as (exit price - entry price) &times; quantity for long trades, minus commissions.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#34d399' }}>Win Rate</h4>
                <p>The percentage of your trades that are profitable. A 50% win rate means half your trades are winners.</p>
                <span className="formula">Winners / Total Trades &times; 100</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#a78bfa' }}>R-Multiple</h4>
                <p>How much you made or lost relative to your initial risk. A 2R trade means you made twice what you risked. Requires a stop loss to calculate.</p>
                <span className="formula">P&amp;L / (Entry - Stop Loss) &times; Quantity</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#fbbf24' }}>Profit Factor</h4>
                <p>Total gross profit divided by total gross loss. A profit factor above 1.0 means you're profitable. Above 2.0 is excellent.</p>
                <span className="formula">Gross Profits / Gross Losses</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#f87171' }}>Max Drawdown</h4>
                <p>The largest drop from a peak in your cumulative P&amp;L to a subsequent low. Measures your worst losing streak.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#c084fc' }}>Expectancy</h4>
                <p>Your expected profit per trade on average. Positive = you have an edge.</p>
                <span className="formula">(Win% &times; Avg Win) - (Loss% &times; Avg Loss)</span>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#06b6d4' }}>Consistency Score</h4>
                <p>A 0-100 score measuring how evenly distributed your profits are. High scores mean steady results, not relying on one lucky trade.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#22c55e' }}>Equity Curve</h4>
                <p>A line chart of your cumulative P&amp;L over time. A smoothly rising equity curve indicates consistent profitability.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#f97316' }}>Risk:Reward Ratio</h4>
                <p>The potential profit compared to the potential loss on a trade. A 1:3 ratio means you risk $1 to potentially make $3.</p>
              </div>
              <div className="metric-def">
                <h4 style={{ color: '#ec4899' }}>Position Sizing</h4>
                <p>How many shares/units to buy based on your account size, risk percentage, and the distance to your stop loss.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </JournalLayout>
  );
}
