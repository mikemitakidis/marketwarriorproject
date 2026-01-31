import Head from 'next/head';
import Link from 'next/link';

export default function TradingJournalUserGuide() {
  return (
    <>
      <Head>
        <title>Trading Journal User Guide - Market Warrior</title>
        <meta name="description" content="Learn how to use the Market Warrior Trading Journal to track and improve your trading performance." />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1e2e 100%);
          color: #e0e0e0;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 50px;
        }
        .logo-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 2.5rem;
          color: white;
          margin-bottom: 16px;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.2rem;
        }
        .section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
        }
        .section h2 {
          color: #667eea;
          font-size: 1.5rem;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section p {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.8;
          margin-bottom: 16px;
        }
        .section ul {
          list-style: none;
          padding: 0;
        }
        .section li {
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 12px;
        }
        .section li:last-child {
          border-bottom: none;
        }
        .feature-icon {
          font-size: 1.2rem;
        }
        .feature-content strong {
          color: white;
          display: block;
          margin-bottom: 4px;
        }
        .feature-content span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
        .cta-section {
          text-align: center;
          padding: 40px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 16px;
        }
        .cta-section h2 {
          color: white;
          margin-bottom: 16px;
        }
        .cta-btn {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1.1rem;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 16px;
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .back-link {
          display: inline-block;
          color: #667eea;
          text-decoration: none;
          margin-bottom: 30px;
          font-size: 0.9rem;
        }
        .back-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="container">
        <Link href="/" className="back-link">
          Back to Home
        </Link>

        <div className="header">
          <div className="logo-icon">📊</div>
          <h1>Trading Journal User Guide</h1>
          <p className="subtitle">Master your trading with data-driven insights</p>
        </div>

        <div className="section">
          <h2><span>🚀</span> Getting Started</h2>
          <p>
            The Market Warrior Trading Journal is a powerful tool designed to help you track,
            analyze, and improve your trading performance. Whether you&apos;re a beginner or an
            experienced trader, keeping a detailed journal is essential for long-term success.
          </p>
          <p>
            To get started, simply create a free account and begin logging your trades. The journal
            will automatically calculate your statistics, identify patterns, and help you become
            a more consistent trader.
          </p>
        </div>

        <div className="section">
          <h2><span>✨</span> Key Features</h2>
          <ul>
            <li>
              <span className="feature-icon">📝</span>
              <div className="feature-content">
                <strong>Trade Logging</strong>
                <span>Log all your trades with detailed entry/exit prices, position size, and notes</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">📈</span>
              <div className="feature-content">
                <strong>Advanced Analytics</strong>
                <span>Track win rate, profit factor, R-multiples, and other key metrics</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">🤖</span>
              <div className="feature-content">
                <strong>AI Coach</strong>
                <span>Get personalized insights and feedback on your trading patterns</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">🎯</span>
              <div className="feature-content">
                <strong>Trading Rules</strong>
                <span>Define your trading rules and get alerts when you break them</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">📚</span>
              <div className="feature-content">
                <strong>Playbook</strong>
                <span>Document your best setups and strategies for future reference</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">🏆</span>
              <div className="feature-content">
                <strong>Goals Tracking</strong>
                <span>Set and track your trading goals to stay motivated</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">📥</span>
              <div className="feature-content">
                <strong>CSV Import</strong>
                <span>Import trades from your broker or other platforms</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">📉</span>
              <div className="feature-content">
                <strong>Charts</strong>
                <span>View TradingView charts directly in the journal</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="section">
          <h2><span>💡</span> Tips for Success</h2>
          <ul>
            <li>
              <span className="feature-icon">1️⃣</span>
              <div className="feature-content">
                <strong>Log Every Trade</strong>
                <span>Even small trades matter. Consistency in logging leads to better insights.</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">2️⃣</span>
              <div className="feature-content">
                <strong>Use Tags</strong>
                <span>Tag your trades with setups, emotions, and market conditions for pattern analysis.</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">3️⃣</span>
              <div className="feature-content">
                <strong>Review Weekly</strong>
                <span>Set aside time each week to review your trades and identify areas for improvement.</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">4️⃣</span>
              <div className="feature-content">
                <strong>Define Your Rules</strong>
                <span>Use the Challenge feature to set trading rules and hold yourself accountable.</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">5️⃣</span>
              <div className="feature-content">
                <strong>Build Your Playbook</strong>
                <span>Document your winning setups so you can replicate them consistently.</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="cta-section">
          <h2>Ready to Start?</h2>
          <p>Create your free account and begin your journey to becoming a better trader.</p>
          <Link href="/trading-journal/login?register=true" className="cta-btn">
            Get Started Free
          </Link>
        </div>
      </div>
    </>
  );
}
