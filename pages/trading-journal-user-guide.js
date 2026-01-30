import Head from 'next/head';
import Link from 'next/link';
import { getUserFromRequest, getServiceSupabase } from '../lib/serverAuth';

export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login?next=/trading-journal-user-guide', permanent: false } };
    }

    const supabase = getServiceSupabase();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, has_paid')
      .eq('id', user.id)
      .single();

    return {
      props: {
        user: {
          fullName: profile?.full_name || null,
          isStudent: profile?.has_paid || false,
        },
      },
    };
  } catch (err) {
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function UserGuide({ user }) {
  return (
    <>
      <Head>
        <title>Trading Journal User Guide - Market Warrior</title>
        <meta name="description" content="Complete guide to using the Market Warrior Trading Journal" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1e2e 100%);
          color: #e0e0e0;
          min-height: 100vh;
          line-height: 1.6;
        }
      `}</style>

      <style jsx>{`
        .header {
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 16px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-content {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #818cf8;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.15s;
        }
        .back-link:hover {
          color: #a5b4fc;
        }
        .user-name {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        .hero {
          text-align: center;
          margin-bottom: 60px;
          padding: 40px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 16px;
        }
        .hero-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }
        .hero-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .toc {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 48px;
        }
        .toc-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 16px;
        }
        .toc-list {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 24px;
        }
        .toc-list a {
          color: #818cf8;
          text-decoration: none;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }
        .toc-list a:hover {
          color: #a5b4fc;
        }
        .toc-number {
          width: 24px;
          height: 24px;
          background: rgba(129, 140, 248, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .section {
          margin-bottom: 48px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .section-number {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 700;
          color: white;
        }
        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
        }

        .content {
          color: rgba(255, 255, 255, 0.8);
        }
        .content p {
          margin-bottom: 16px;
        }
        .content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #818cf8;
          margin: 24px 0 12px;
        }
        .content ul, .content ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }
        .content li {
          margin-bottom: 8px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 20px 0;
        }
        .feature-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 16px;
        }
        .feature-card-title {
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feature-card p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .tip-box {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0;
        }
        .tip-box-title {
          font-weight: 600;
          color: #34d399;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tip-box p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          font-size: 0.9rem;
        }

        .warning-box {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0;
        }
        .warning-box-title {
          font-weight: 600;
          color: #fbbf24;
          margin-bottom: 8px;
        }
        .warning-box p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          font-size: 0.9rem;
        }

        .kbd {
          display: inline-block;
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .footer {
          text-align: center;
          padding: 40px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.5);
        }
        .footer a {
          color: #818cf8;
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .toc-list {
            grid-template-columns: 1fr;
          }
          .feature-grid {
            grid-template-columns: 1fr;
          }
          .hero-title {
            font-size: 1.75rem;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-content">
          <Link href="/trading-journal" className="back-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" />
            </svg>
            Back to Journal
          </Link>
          <span className="user-name">{user.fullName || 'Trader'}</span>
        </div>
      </header>

      <div className="container">
        <div className="hero">
          <h1 className="hero-title">Trading Journal User Guide</h1>
          <p className="hero-subtitle">Everything you need to know to master your trading journal</p>
        </div>

        <nav className="toc">
          <h2 className="toc-title">Table of Contents</h2>
          <ul className="toc-list">
            <li><a href="#getting-started"><span className="toc-number">1</span> Getting Started</a></li>
            <li><a href="#logging-trades"><span className="toc-number">2</span> Logging Trades</a></li>
            <li><a href="#trade-log"><span className="toc-number">3</span> Trade Log</a></li>
            <li><a href="#analytics"><span className="toc-number">4</span> Analytics</a></li>
            <li><a href="#goals"><span className="toc-number">5</span> Goals</a></li>
            <li><a href="#ai-coach"><span className="toc-number">6</span> AI Coach</a></li>
            <li><a href="#playbook"><span className="toc-number">7</span> Playbook</a></li>
            <li><a href="#calculators"><span className="toc-number">8</span> Calculators</a></li>
            <li><a href="#charts"><span className="toc-number">9</span> Charts</a></li>
            <li><a href="#share"><span className="toc-number">10</span> Share</a></li>
            <li><a href="#challenge"><span className="toc-number">11</span> Challenge Mode</a></li>
            <li><a href="#settings"><span className="toc-number">12</span> Settings</a></li>
          </ul>
        </nav>

        <section id="getting-started" className="section">
          <div className="section-header">
            <span className="section-number">1</span>
            <h2 className="section-title">Getting Started</h2>
          </div>
          <div className="content">
            <p>Welcome to the Market Warrior Trading Journal! This powerful tool helps you track, analyze, and improve your trading performance.</p>

            <h3>First Steps</h3>
            <ol>
              <li><strong>Configure Settings:</strong> Go to Settings and set your account size, base currency, and default risk percentage.</li>
              <li><strong>Create Your Playbook:</strong> Define your trading strategies and setups in the Playbook section.</li>
              <li><strong>Set Goals:</strong> Establish weekly/monthly P&L targets and win rate goals.</li>
              <li><strong>Log Your First Trade:</strong> Use the Add Trade page to record your first trade.</li>
            </ol>

            <div className="tip-box">
              <div className="tip-box-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Pro Tip
              </div>
              <p>Set your Account Size in Settings to see your budget displayed in the top-right corner of every page.</p>
            </div>
          </div>
        </section>

        <section id="logging-trades" className="section">
          <div className="section-header">
            <span className="section-number">2</span>
            <h2 className="section-title">Logging Trades</h2>
          </div>
          <div className="content">
            <p>Recording trades accurately is the foundation of good trade journaling. The Add Trade page provides a comprehensive form to capture all relevant details.</p>

            <h3>Required Fields</h3>
            <ul>
              <li><strong>Symbol:</strong> The ticker symbol (e.g., AAPL, EURUSD, BTC)</li>
              <li><strong>Direction:</strong> Long or Short</li>
              <li><strong>Entry Price:</strong> Your entry price</li>
              <li><strong>Position Size:</strong> Number of shares, contracts, or units</li>
              <li><strong>Entry Date:</strong> When you entered the trade</li>
            </ul>

            <h3>Optional but Recommended</h3>
            <ul>
              <li><strong>Stop Loss:</strong> Your initial stop loss price (calculates R-multiples)</li>
              <li><strong>Take Profit:</strong> Your target price</li>
              <li><strong>Setup/Strategy:</strong> Link to your Playbook strategy</li>
              <li><strong>Tags:</strong> Categorize trades (e.g., "breakout", "earnings", "swing")</li>
              <li><strong>Notes:</strong> Capture your reasoning and observations</li>
              <li><strong>Screenshots:</strong> Attach chart images for later review</li>
            </ul>

            <h3>Closing Trades</h3>
            <p>When you exit a trade, edit it to add the exit price and exit date. The journal will automatically calculate your P&L and R-multiple.</p>

            <div className="warning-box">
              <div className="warning-box-title">Important</div>
              <p>Always set a stop loss! Without it, your R-multiples and risk metrics cannot be calculated accurately.</p>
            </div>
          </div>
        </section>

        <section id="trade-log" className="section">
          <div className="section-header">
            <span className="section-number">3</span>
            <h2 className="section-title">Trade Log</h2>
          </div>
          <div className="content">
            <p>The Trade Log displays all your trades in a sortable, filterable table format.</p>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-card-title">Filter by Status</div>
                <p>View All, Open, or Closed trades</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Date Range</div>
                <p>Filter trades by specific date ranges</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Symbol Search</div>
                <p>Quickly find trades by ticker symbol</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Tag Filter</div>
                <p>Filter by custom tags you've assigned</p>
              </div>
            </div>

            <p>Click on any trade to view details, edit, or add notes. Use the export feature to download your trades as CSV.</p>
          </div>
        </section>

        <section id="analytics" className="section">
          <div className="section-header">
            <span className="section-number">4</span>
            <h2 className="section-title">Analytics</h2>
          </div>
          <div className="content">
            <p>The Analytics page provides deep insights into your trading performance with various charts and breakdowns.</p>

            <h3>Key Metrics</h3>
            <ul>
              <li><strong>Win Rate:</strong> Percentage of winning trades</li>
              <li><strong>Profit Factor:</strong> Gross profits divided by gross losses (above 1.5 is good)</li>
              <li><strong>Average R-Multiple:</strong> Your average risk-reward ratio achieved</li>
              <li><strong>Expectancy:</strong> Expected profit per trade</li>
              <li><strong>Max Drawdown:</strong> Largest peak-to-trough decline</li>
            </ul>

            <h3>Available Charts</h3>
            <ul>
              <li>Equity Curve (cumulative P&L over time)</li>
              <li>P&L by Day of Week</li>
              <li>P&L by Hour of Day</li>
              <li>Performance by Symbol</li>
              <li>Performance by Strategy</li>
              <li>Win/Loss Distribution</li>
            </ul>

            <div className="tip-box">
              <div className="tip-box-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Pro Tip
              </div>
              <p>Check your P&L by Day of Week to identify if certain days are consistently unprofitable.</p>
            </div>
          </div>
        </section>

        <section id="goals" className="section">
          <div className="section-header">
            <span className="section-number">5</span>
            <h2 className="section-title">Goals</h2>
          </div>
          <div className="content">
            <p>Setting and tracking goals keeps you accountable and focused on continuous improvement.</p>

            <h3>Goal Types</h3>
            <ul>
              <li><strong>P&L Goals:</strong> Target profit amounts (weekly, monthly)</li>
              <li><strong>Win Rate Goals:</strong> Target win percentage</li>
              <li><strong>Trade Count Goals:</strong> Minimum or maximum trades per period</li>
              <li><strong>Consistency Goals:</strong> Maintain discipline streaks</li>
            </ul>

            <p>Goals automatically track your progress and show completion percentage. Review past goals to see your historical performance.</p>
          </div>
        </section>

        <section id="ai-coach" className="section">
          <div className="section-header">
            <span className="section-number">6</span>
            <h2 className="section-title">AI Coach</h2>
          </div>
          <div className="content">
            <p>Your personal AI trading coach analyzes your trades and provides actionable insights to improve your performance.</p>

            <h3>Features</h3>
            <ul>
              <li><strong>Performance Analysis:</strong> Get feedback on your recent trading patterns</li>
              <li><strong>Weakness Detection:</strong> Identify areas that need improvement</li>
              <li><strong>Strategy Review:</strong> Analyze which setups work best for you</li>
              <li><strong>Mindset Tips:</strong> Receive psychological coaching</li>
            </ul>

            <p>Ask the AI Coach questions like "Why am I losing on Mondays?" or "Which of my strategies has the best risk-reward?"</p>
          </div>
        </section>

        <section id="playbook" className="section">
          <div className="section-header">
            <span className="section-number">7</span>
            <h2 className="section-title">Playbook</h2>
          </div>
          <div className="content">
            <p>Your Playbook is where you define and document your trading strategies and setups.</p>

            <h3>Creating a Strategy</h3>
            <ol>
              <li>Give it a clear name (e.g., "Opening Range Breakout")</li>
              <li>Describe the setup criteria</li>
              <li>Define entry rules</li>
              <li>Set exit rules (stop loss and take profit)</li>
              <li>Add any notes or conditions</li>
            </ol>

            <p>When logging trades, link them to your Playbook strategies. This allows you to track performance by strategy and identify your most profitable setups.</p>
          </div>
        </section>

        <section id="calculators" className="section">
          <div className="section-header">
            <span className="section-number">8</span>
            <h2 className="section-title">Calculators</h2>
          </div>
          <div className="content">
            <p>Built-in calculators help you with position sizing and risk management.</p>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-card-title">Position Size Calculator</div>
                <p>Calculate optimal position size based on your risk tolerance</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Risk/Reward Calculator</div>
                <p>Determine your risk-reward ratio before entering</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Pip Value Calculator</div>
                <p>For forex traders to calculate pip values</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-title">Profit/Loss Calculator</div>
                <p>Estimate potential outcomes before trading</p>
              </div>
            </div>
          </div>
        </section>

        <section id="charts" className="section">
          <div className="section-header">
            <span className="section-number">9</span>
            <h2 className="section-title">Charts</h2>
          </div>
          <div className="content">
            <p>The Charts page provides visual representations of your trading data with TradingView integration.</p>

            <h3>Available Views</h3>
            <ul>
              <li>Equity curve with drawdown overlay</li>
              <li>Calendar heatmap of daily P&L</li>
              <li>Trade distribution charts</li>
              <li>Symbol price charts with your trade entries/exits marked</li>
            </ul>
          </div>
        </section>

        <section id="share" className="section">
          <div className="section-header">
            <span className="section-number">10</span>
            <h2 className="section-title">Share</h2>
          </div>
          <div className="content">
            <p>Create beautiful share cards to showcase your trading performance on social media or with your community.</p>

            <h3>Share Card Options</h3>
            <ul>
              <li>Daily P&L summary</li>
              <li>Weekly/monthly performance recap</li>
              <li>Individual trade highlights</li>
              <li>Milestone achievements</li>
            </ul>

            <p>Cards are generated as images that you can download and share. Your account details remain private.</p>
          </div>
        </section>

        <section id="challenge" className="section">
          <div className="section-header">
            <span className="section-number">11</span>
            <h2 className="section-title">Challenge Mode</h2>
          </div>
          <div className="content">
            <p>Challenge Mode helps you build discipline by tracking rule violations and maintaining accountability.</p>

            <h3>How It Works</h3>
            <ol>
              <li>Define your trading rules (e.g., "Max 3 trades per day")</li>
              <li>Log violations when you break rules</li>
              <li>Acknowledge violations with lessons learned</li>
              <li>Track your discipline score over time</li>
            </ol>

            <p>The Consistency Score on your dashboard reflects how well you're following your own rules.</p>
          </div>
        </section>

        <section id="settings" className="section">
          <div className="section-header">
            <span className="section-number">12</span>
            <h2 className="section-title">Settings</h2>
          </div>
          <div className="content">
            <p>Configure your journal to match your trading style and preferences.</p>

            <h3>Key Settings</h3>
            <ul>
              <li><strong>Account Size:</strong> Your trading capital (displayed in header)</li>
              <li><strong>Base Currency:</strong> USD, EUR, GBP, etc.</li>
              <li><strong>Default Risk %:</strong> Your standard risk per trade</li>
              <li><strong>Time Zone:</strong> For accurate trade timestamps</li>
              <li><strong>Trading Rules:</strong> Define rules for Challenge Mode</li>
            </ul>

            <div className="tip-box">
              <div className="tip-box-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Pro Tip
              </div>
              <p>Update your Account Size regularly to keep your position sizing calculations accurate.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="footer">
        <p>Need help? Contact us at <a href="mailto:support@marketwarrior.com">support@marketwarrior.com</a></p>
        <p style={{ marginTop: '8px' }}>
          <Link href="/trading-journal">Return to Trading Journal</Link>
        </p>
      </footer>
    </>
  );
}
