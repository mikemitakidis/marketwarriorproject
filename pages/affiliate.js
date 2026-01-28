import Head from 'next/head';
import Link from 'next/link';

/**
 * Public Affiliate Page (/affiliate)
 *
 * Landing page for the general affiliate program (20% commission).
 * Anyone can view and join this tier.
 */
export default function AffiliatePage() {
  return (
    <>
      <Head>
        <title>Affiliate Programme - Market Warrior</title>
        <meta name="description" content="Join the Market Warrior affiliate programme and earn 20% commission on every sale you refer. Start earning today!" />
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          color: white;
          min-height: 100vh;
          line-height: 1.6;
        }
      `}</style>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(30, 41, 59, 0.95);
          border-bottom: 1px solid #334155;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          color: #667eea;
          text-decoration: none;
        }
        .logo:hover { opacity: 0.9; }
        .logo img { width: 40px; height: 40px; border-radius: 8px; }
        .nav-links { display: flex; gap: 16px; align-items: center; }
        .nav-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .nav-link:hover { color: white; }
        .login-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .hero {
          text-align: center;
          padding: 80px 24px 60px;
          background: linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, transparent 100%);
        }
        .hero-badge {
          display: inline-block;
          background: rgba(102, 126, 234, 0.2);
          color: #a5b4fc;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 20px;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }
        .hero h1 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero p {
          font-size: 1.25rem;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto 32px;
        }
        .commission-highlight {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }
        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .cta-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 40px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.1rem;
          transition: transform 0.2s, box-shadow 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .cta-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s;
        }
        .cta-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .section {
          padding: 60px 0;
        }
        .section-title {
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 40px;
        }

        /* What is an Affiliate Section */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        .info-card {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 28px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .info-card:hover {
          transform: translateY(-4px);
          border-color: #667eea;
        }
        .info-card-icon {
          font-size: 2.5rem;
          margin-bottom: 16px;
        }
        .info-card h3 {
          font-size: 1.25rem;
          margin-bottom: 12px;
          color: #f1f5f9;
        }
        .info-card p {
          color: #94a3b8;
          font-size: 0.95rem;
          line-height: 1.7;
        }

        /* How it Works */
        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        .step {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 24px;
        }
        .step-number {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .step-content h3 {
          font-size: 1.1rem;
          margin-bottom: 8px;
          color: #f1f5f9;
        }
        .step-content p {
          color: #94a3b8;
          font-size: 0.95rem;
        }

        /* Tier Box */
        .tier-box {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%);
          border: 2px solid #10b981;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          max-width: 600px;
          margin: 0 auto 40px;
        }
        .tier-label {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .tier-box h2 {
          font-size: 1.75rem;
          margin-bottom: 12px;
        }
        .tier-commission {
          font-size: 3.5rem;
          font-weight: 800;
          color: #10b981;
          margin-bottom: 8px;
        }
        .tier-desc {
          color: #94a3b8;
          margin-bottom: 24px;
        }
        .tier-features {
          text-align: left;
          margin-bottom: 24px;
        }
        .tier-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          color: #e2e8f0;
        }
        .tier-feature-icon {
          color: #10b981;
          font-size: 1.2rem;
        }

        /* Student Upgrade Box */
        .upgrade-box {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }
        .upgrade-box h3 {
          font-size: 1.5rem;
          margin-bottom: 12px;
          color: #a5b4fc;
        }
        .upgrade-box p {
          color: #94a3b8;
          margin-bottom: 20px;
        }
        .upgrade-link {
          color: #a5b4fc;
          text-decoration: none;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }
        .upgrade-link:hover { color: white; }

        /* Rules Section */
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 24px;
        }
        .rules-card {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 28px;
        }
        .rules-card.allowed {
          border-color: rgba(16, 185, 129, 0.3);
        }
        .rules-card.not-allowed {
          border-color: rgba(239, 68, 68, 0.3);
        }
        .rules-card h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.25rem;
          margin-bottom: 16px;
        }
        .rules-card.allowed h3 { color: #10b981; }
        .rules-card.not-allowed h3 { color: #ef4444; }
        .rules-list {
          list-style: none;
        }
        .rules-list li {
          padding: 8px 0;
          color: #94a3b8;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .rules-list li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-top: 8px;
          flex-shrink: 0;
        }
        .rules-card.allowed .rules-list li::before {
          background: #10b981;
        }
        .rules-card.not-allowed .rules-list li::before {
          background: #ef4444;
        }

        /* Payout Info */
        .payout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          max-width: 800px;
          margin: 0 auto 40px;
        }
        .payout-item {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        .payout-item-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 8px;
        }
        .payout-item-label {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        /* Best Practices */
        .tips-list {
          max-width: 700px;
          margin: 0 auto;
        }
        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid #334155;
        }
        .tip-item:last-child { border-bottom: none; }
        .tip-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .tip-item h4 {
          font-size: 1rem;
          margin-bottom: 4px;
          color: #f1f5f9;
        }
        .tip-item p {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        /* Tracking Disclaimer */
        .disclaimer-box {
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          border-radius: 12px;
          padding: 24px;
          margin-top: 40px;
        }
        .disclaimer-box h4 {
          color: #fbbf24;
          font-size: 1rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .disclaimer-box p {
          color: #94a3b8;
          font-size: 0.85rem;
          line-height: 1.7;
        }

        /* Footer */
        .footer {
          background: rgba(15, 23, 42, 0.9);
          border-top: 1px solid #334155;
          padding: 40px 24px;
          margin-top: 60px;
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }
        .footer-links {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .footer-link {
          color: #64748b;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .footer-link:hover { color: #94a3b8; }
        .footer-copy {
          color: #475569;
          font-size: 0.85rem;
        }

        /* Final CTA */
        .final-cta {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border-radius: 24px;
          padding: 60px 40px;
          text-align: center;
          margin-top: 40px;
        }
        .final-cta h2 {
          font-size: 2rem;
          margin-bottom: 16px;
        }
        .final-cta p {
          color: #94a3b8;
          margin-bottom: 24px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 768px) {
          .hero h1 { font-size: 2rem; }
          .hero p { font-size: 1rem; }
          .commission-highlight { font-size: 1.2rem; padding: 12px 24px; }
          .tier-commission { font-size: 2.5rem; }
          .rules-grid { grid-template-columns: 1fr; }
          .header { flex-direction: column; gap: 16px; }
          .nav-links { flex-wrap: wrap; justify-content: center; }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <Link href="/" className="logo">
          <img src="/logo.png" alt="Market Warrior" />
          <span>Market Warrior</span>
        </Link>
        <nav className="nav-links">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/students-affiliate" className="nav-link">Student Affiliates</Link>
          <a href="https://affiliates.marketwarrior.club/login" className="nav-link">Affiliate Login</a>
          <Link href="/login" className="login-btn">Sign In</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <span className="hero-badge">Affiliate Programme</span>
        <h1>Earn With Market Warrior</h1>
        <p>Join our affiliate programme and earn commissions by sharing the 30-Day Trading Challenge with your audience.</p>
        <div className="commission-highlight">
          <span>Earn 20% Commission</span>
        </div>
        <div className="cta-buttons">
          <a href="https://affiliates.marketwarrior.club/signup" className="cta-primary">
            Join Now
          </a>
          <a href="https://affiliates.marketwarrior.club/login" className="cta-secondary">
            Already an Affiliate? Login
          </a>
        </div>
      </section>

      <div className="container">
        {/* What is an Affiliate */}
        <section className="section">
          <h2 className="section-title">What is Affiliate Marketing?</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-icon">🤝</div>
              <h3>What is an Affiliate?</h3>
              <p>An affiliate is someone who promotes a product they believe in and earns a commission for every successful tracked sale they refer. Share your unique link, and when someone purchases through it, you earn!</p>
            </div>
            <div className="info-card">
              <div className="info-card-icon">🍪</div>
              <h3>30-Day Cookie Window</h3>
              <p>When someone clicks your link, a tracking cookie is stored for 30 days. If they purchase within that window on the same browser/device, the referral is credited to you.</p>
            </div>
            <div className="info-card">
              <div className="info-card-icon">📅</div>
              <h3>What is Net-15?</h3>
              <p>Net-15 means commissions are paid after a 15-day verification period. This allows time for refund processing and payment confirmation before your payout.</p>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="section">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Sign Up & Get Your Link</h3>
                <p>Register as an affiliate and receive your unique tracking link. It takes just a minute to set up.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Share With Your Audience</h3>
                <p>Share your link on social media, your blog, newsletter, or anywhere your audience hangs out.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Earn Commission</h3>
                <p>When someone purchases through your link, the sale is tracked and your commission is added to your balance.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Get Paid</h3>
                <p>Payouts are processed on a Net-15 schedule via PayPal once you reach the minimum threshold.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Commission Tier */}
        <section className="section">
          <h2 className="section-title">Public Affiliate Programme</h2>
          <div className="tier-box">
            <span className="tier-label">Tier B - Open to Everyone</span>
            <h2>General Affiliates</h2>
            <div className="tier-commission">20%</div>
            <p className="tier-desc">Commission on every eligible referred sale</p>
            <div className="tier-features">
              <div className="tier-feature">
                <span className="tier-feature-icon">✓</span>
                <span>Open to anyone who wants to promote the course</span>
              </div>
              <div className="tier-feature">
                <span className="tier-feature-icon">✓</span>
                <span>Get your unique tracking link instantly</span>
              </div>
              <div className="tier-feature">
                <span className="tier-feature-icon">✓</span>
                <span>30-day cookie window for tracking</span>
              </div>
              <div className="tier-feature">
                <span className="tier-feature-icon">✓</span>
                <span>PayPal payouts on Net-15 schedule</span>
              </div>
            </div>
            <a href="https://affiliates.marketwarrior.club/signup" className="cta-primary">
              Join as Public Affiliate
            </a>
          </div>

          {/* Student Upgrade Box */}
          <div className="upgrade-box">
            <h3>Already a Student?</h3>
            <p>Verified students get access to our premium Tier A programme with 30% commission.</p>
            <Link href="/students-affiliate" className="upgrade-link">
              View Student Affiliate Programme →
            </Link>
          </div>
        </section>

        {/* Payout Details */}
        <section className="section">
          <h2 className="section-title">Payout Details</h2>
          <div className="payout-grid">
            <div className="payout-item">
              <div className="payout-item-value">Net-15</div>
              <div className="payout-item-label">Payout Schedule</div>
            </div>
            <div className="payout-item">
              <div className="payout-item-value">$50 USD</div>
              <div className="payout-item-label">Minimum Payout</div>
            </div>
            <div className="payout-item">
              <div className="payout-item-value">PayPal</div>
              <div className="payout-item-label">Payment Method</div>
            </div>
            <div className="payout-item">
              <div className="payout-item-value">30 Days</div>
              <div className="payout-item-label">Cookie Duration</div>
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="section">
          <h2 className="section-title">Promotion Rules</h2>
          <div className="rules-grid">
            <div className="rules-card allowed">
              <h3>✓ Allowed</h3>
              <ul className="rules-list">
                <li>Organic content on TikTok, Instagram, YouTube, X (Twitter)</li>
                <li>Blog posts and articles</li>
                <li>Email newsletters to your own list</li>
                <li>Your personal website</li>
                <li>Private communities where permitted</li>
              </ul>
            </div>
            <div className="rules-card not-allowed">
              <h3>✗ Not Allowed</h3>
              <ul className="rules-list">
                <li>Misleading claims or "guaranteed profits"</li>
                <li>Impersonating Market Warrior Club</li>
                <li>Unapproved coupon/discount codes</li>
                <li>Bidding on "MarketWarrior" keywords in paid ads</li>
                <li>Self-referrals (immediate termination)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="section">
          <h2 className="section-title">Best Practices</h2>
          <div className="tips-list">
            <div className="tip-item">
              <span className="tip-icon">🔗</span>
              <div>
                <h4>One Link Everywhere</h4>
                <p>Use your unique link consistently across all platforms - bio, pinned comments, stories.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">💬</span>
              <div>
                <h4>Add a Personal Touch</h4>
                <p>Tell people who the course is for and why you personally recommend it.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🎯</span>
              <div>
                <h4>Clear Call-to-Action</h4>
                <p>Use phrases like "Start the 30-Day Challenge" with "Link in bio" for social posts.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🔄</span>
              <div>
                <h4>Be Consistent</h4>
                <p>Repeat your link during launches - stories, reels, pinned posts all work well.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">⭐</span>
              <div>
                <h4>Authentic Reviews</h4>
                <p>1-2 honest sentences about your experience perform better than generic promotion.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tracking Disclaimer */}
        <div className="disclaimer-box">
          <h4>⚠️ Tracking Agreement</h4>
          <p>
            This affiliate programme uses PromoteKit for tracking. Referral tracking relies on cookies and attribution may be affected by ad blockers, browser privacy settings (Safari/Brave), VPNs, iOS/Android tracking restrictions, cookie consent choices, or switching devices/browsers before purchase. A referral is counted only when a customer completes a successful payment and the referral is properly tracked. Market Warrior Club is not responsible for missing clicks or unattributed sales caused by technical limitations or user privacy settings.
          </p>
        </div>

        {/* Final CTA */}
        <div className="final-cta">
          <h2>Ready to Start Earning?</h2>
          <p>Join thousands of affiliates promoting the 30-Day Trading Challenge and earning commissions.</p>
          <a href="https://affiliates.marketwarrior.club/signup" className="cta-primary">
            Join the Affiliate Programme
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link href="/" className="footer-link">Home</Link>
            <Link href="/affiliate-terms" className="footer-link">Affiliate Terms</Link>
            <Link href="/terms" className="footer-link">Terms of Service</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <a href="https://affiliates.marketwarrior.club/login" className="footer-link">Affiliate Login</a>
            <a href="mailto:support@marketwarrior.club" className="footer-link">Support</a>
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} Market Warrior Club. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
