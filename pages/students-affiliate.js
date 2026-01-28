import Head from 'next/head';
import Link from 'next/link';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../lib/serverAuth';

/**
 * Student Affiliate Page (/students-affiliate)
 *
 * Private page for verified students with 30% commission tier.
 * Requires authentication and course purchase.
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login?redirect=/students-affiliate', permanent: false } };
    }

    const gate = await getGateStatus(user.id, user.email);

    // Must be a paid student to access this page
    if (!gate.hasPaid) {
      return {
        props: {
          isStudent: false,
          user: { email: user.email },
        },
      };
    }

    // Get user profile
    const supabase = getServiceSupabase();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    return {
      props: {
        isStudent: true,
        user: {
          email: user.email,
          fullName: profile?.full_name || 'Student',
        },
      },
    };
  } catch (err) {
    console.error('Student affiliate page error:', err);
    return { redirect: { destination: '/login?redirect=/students-affiliate', permanent: false } };
  }
}

export default function StudentsAffiliatePage({ isStudent, user }) {
  return (
    <>
      <Head>
        <title>Student Affiliate Programme - Market Warrior</title>
        <meta name="description" content="Exclusive affiliate programme for Market Warrior students. Earn 30% commission on every referral." />
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
        .user-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .dashboard-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .dashboard-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .hero {
          text-align: center;
          padding: 80px 24px 60px;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, transparent 100%);
        }
        .hero-badge {
          display: inline-block;
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 20px;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .hero h1 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #fff 0%, #6ee7b7 100%);
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
          padding: 20px 40px;
          border-radius: 16px;
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 24px;
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
        }
        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .cta-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 18px 48px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.2rem;
          transition: transform 0.2s, box-shadow 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
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

        /* Not a Student Block */
        .not-student-block {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
          padding: 60px 24px;
        }
        .not-student-icon {
          font-size: 4rem;
          margin-bottom: 24px;
        }
        .not-student-block h2 {
          font-size: 1.75rem;
          margin-bottom: 16px;
          color: #fbbf24;
        }
        .not-student-block p {
          color: #94a3b8;
          margin-bottom: 24px;
          line-height: 1.7;
        }
        .not-student-options {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .option-btn {
          padding: 14px 28px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }
        .option-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .option-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .option-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .option-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* Comparison Table */
        .comparison-section {
          margin-bottom: 60px;
        }
        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          max-width: 800px;
          margin: 0 auto;
        }
        .tier-card {
          background: rgba(30, 41, 59, 0.6);
          border: 2px solid #334155;
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .tier-card.highlighted {
          border-color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%);
        }
        .tier-card.highlighted::before {
          content: 'YOUR TIER';
          position: absolute;
          top: 12px;
          right: -32px;
          background: #10b981;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 4px 40px;
          transform: rotate(45deg);
        }
        .tier-card-label {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .tier-card:not(.highlighted) .tier-card-label {
          background: rgba(102, 126, 234, 0.2);
          color: #a5b4fc;
        }
        .tier-card.highlighted .tier-card-label {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        .tier-card h3 {
          font-size: 1.25rem;
          margin-bottom: 8px;
        }
        .tier-commission {
          font-size: 3rem;
          font-weight: 800;
          margin: 16px 0;
        }
        .tier-card:not(.highlighted) .tier-commission {
          color: #a5b4fc;
        }
        .tier-card.highlighted .tier-commission {
          color: #10b981;
        }
        .tier-features {
          text-align: left;
          margin: 20px 0;
        }
        .tier-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        .tier-feature-icon {
          width: 20px;
          text-align: center;
        }
        .tier-card:not(.highlighted) .tier-feature-icon { color: #a5b4fc; }
        .tier-card.highlighted .tier-feature-icon { color: #10b981; }
        .tier-card-btn {
          display: block;
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 16px;
          transition: all 0.2s;
        }
        .tier-card:not(.highlighted) .tier-card-btn {
          background: rgba(102, 126, 234, 0.2);
          color: #a5b4fc;
        }
        .tier-card.highlighted .tier-card-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .tier-card.highlighted .tier-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        /* Benefits Grid */
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .benefit-card {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 16px;
          padding: 28px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .benefit-card:hover {
          transform: translateY(-4px);
          border-color: #10b981;
        }
        .benefit-icon {
          font-size: 2.5rem;
          margin-bottom: 16px;
        }
        .benefit-card h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: #f1f5f9;
        }
        .benefit-card p {
          color: #94a3b8;
          font-size: 0.95rem;
          line-height: 1.7;
        }

        /* Payout Info */
        .payout-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        .payout-item {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }
        .payout-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #10b981;
          margin-bottom: 8px;
        }
        .payout-label {
          color: #94a3b8;
          font-size: 0.9rem;
        }

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
        .rules-card.allowed { border-color: rgba(16, 185, 129, 0.3); }
        .rules-card.not-allowed { border-color: rgba(239, 68, 68, 0.3); }
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
        .rules-card.allowed .rules-list li::before { background: #10b981; }
        .rules-card.not-allowed .rules-list li::before { background: #ef4444; }

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

        /* Final CTA */
        .final-cta {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
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

        @media (max-width: 768px) {
          .hero h1 { font-size: 2rem; }
          .hero p { font-size: 1rem; }
          .commission-highlight { font-size: 1.3rem; padding: 16px 28px; }
          .tier-commission { font-size: 2.5rem; }
          .comparison-grid { grid-template-columns: 1fr; }
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
          {isStudent && <span className="user-badge">Student</span>}
          <Link href="/affiliate" className="nav-link">Public Programme</Link>
          <a href="https://affiliates.marketwarrior.club/login" className="nav-link">Affiliate Login</a>
          {isStudent ? (
            <Link href="/dashboard" className="dashboard-btn">Dashboard</Link>
          ) : (
            <Link href="/login" className="dashboard-btn">Sign In</Link>
          )}
        </nav>
      </header>

      {!isStudent ? (
        /* Not a Student View */
        <div className="container">
          <div className="not-student-block">
            <div className="not-student-icon">🎓</div>
            <h2>Student Affiliate Programme</h2>
            <p>
              This exclusive 30% commission tier is available only to verified Market Warrior students.
              Complete your course purchase to unlock access to the premium affiliate programme.
            </p>
            <p style={{ marginBottom: '32px' }}>
              Not ready to become a student yet? You can still join our public affiliate programme and earn 20% commission.
            </p>
            <div className="not-student-options">
              <Link href="/" className="option-btn primary">
                Join the Challenge
              </Link>
              <Link href="/affiliate" className="option-btn secondary">
                View Public Programme (20%)
              </Link>
            </div>
          </div>

          {/* Still show comparison */}
          <section className="comparison-section">
            <h2 className="section-title">Compare Affiliate Tiers</h2>
            <div className="comparison-grid">
              <div className="tier-card">
                <span className="tier-card-label">Tier B</span>
                <h3>Public Affiliates</h3>
                <div className="tier-commission">20%</div>
                <div className="tier-features">
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>Open to everyone</span>
                  </div>
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>30-day cookie window</span>
                  </div>
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>Net-15 payouts</span>
                  </div>
                </div>
                <a href="https://affiliates.marketwarrior.club/signup?campaign=4683" className="tier-card-btn">
                  Join Public Programme
                </a>
              </div>

              <div className="tier-card highlighted">
                <span className="tier-card-label">Tier A - Students Only</span>
                <h3>Student Affiliates</h3>
                <div className="tier-commission">30%</div>
                <div className="tier-features">
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>Verified students only</span>
                  </div>
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>30-day cookie window</span>
                  </div>
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>Net-15 payouts</span>
                  </div>
                  <div className="tier-feature">
                    <span className="tier-feature-icon">✓</span>
                    <span>+10% higher commission</span>
                  </div>
                </div>
                <Link href="/" className="tier-card-btn">
                  Become a Student First
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Student View */
        <>
          <section className="hero">
            <span className="hero-badge">Exclusive Student Programme</span>
            <h1>Student Affiliate Programme</h1>
            <p>As a verified Market Warrior student, you have access to our premium affiliate tier with higher commissions.</p>
            <div className="commission-highlight">
              Earn 30% Commission
            </div>
            <div className="cta-buttons">
              <a href="https://affiliates.marketwarrior.club/signup?campaign=4683" className="cta-primary">
                Join Student Programme
              </a>
              <a href="https://affiliates.marketwarrior.club/login" className="cta-secondary">
                Already Joined? Login
              </a>
            </div>
          </section>

          <div className="container">
            {/* Comparison */}
            <section className="section comparison-section">
              <h2 className="section-title">Your Exclusive Tier</h2>
              <div className="comparison-grid">
                <div className="tier-card">
                  <span className="tier-card-label">Tier B</span>
                  <h3>Public Affiliates</h3>
                  <div className="tier-commission">20%</div>
                  <div className="tier-features">
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>Open to everyone</span>
                    </div>
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>30-day cookie window</span>
                    </div>
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>Net-15 payouts</span>
                    </div>
                  </div>
                  <span className="tier-card-btn" style={{ opacity: 0.5, cursor: 'default' }}>
                    Standard Tier
                  </span>
                </div>

                <div className="tier-card highlighted">
                  <span className="tier-card-label">Tier A - Your Tier</span>
                  <h3>Student Affiliates</h3>
                  <div className="tier-commission">30%</div>
                  <div className="tier-features">
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>Verified students only</span>
                    </div>
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>30-day cookie window</span>
                    </div>
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>Net-15 payouts</span>
                    </div>
                    <div className="tier-feature">
                      <span className="tier-feature-icon">✓</span>
                      <span>+10% higher commission</span>
                    </div>
                  </div>
                  <a href="https://affiliates.marketwarrior.club/signup?campaign=4683" className="tier-card-btn">
                    Join Now
                  </a>
                </div>
              </div>
            </section>

            {/* Benefits */}
            <section className="section">
              <h2 className="section-title">Why Join as a Student Affiliate?</h2>
              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon">💰</div>
                  <h3>Higher Earnings</h3>
                  <p>Earn 30% instead of 20% on every sale - that's 50% more commission per referral compared to the public programme.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🎯</div>
                  <h3>Authentic Promotion</h3>
                  <p>You've experienced the course yourself. Your genuine testimonial and insights resonate more with potential students.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🤝</div>
                  <h3>Trusted Recommendations</h3>
                  <p>People trust recommendations from actual students. Your firsthand experience makes your referrals more credible.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">📈</div>
                  <h3>Compound Your Learning</h3>
                  <p>Teaching and sharing what you learn reinforces your own understanding while earning extra income.</p>
                </div>
              </div>
            </section>

            {/* Payout Details */}
            <section className="section">
              <h2 className="section-title">Payout Details</h2>
              <div className="payout-grid">
                <div className="payout-item">
                  <div className="payout-value">30%</div>
                  <div className="payout-label">Commission Rate</div>
                </div>
                <div className="payout-item">
                  <div className="payout-value">Net-15</div>
                  <div className="payout-label">Payout Schedule</div>
                </div>
                <div className="payout-item">
                  <div className="payout-value">$50 USD</div>
                  <div className="payout-label">Minimum Payout</div>
                </div>
                <div className="payout-item">
                  <div className="payout-value">PayPal</div>
                  <div className="payout-label">Payment Method</div>
                </div>
                <div className="payout-item">
                  <div className="payout-value">30 Days</div>
                  <div className="payout-label">Cookie Duration</div>
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
                    <li>Organic content on TikTok, Instagram, YouTube, X</li>
                    <li>Blog posts, articles, and reviews</li>
                    <li>Email newsletters to your own list</li>
                    <li>Your personal website or portfolio</li>
                    <li>Communities where affiliate links are permitted</li>
                    <li>Sharing your genuine course experience</li>
                  </ul>
                </div>
                <div className="rules-card not-allowed">
                  <h3>✗ Not Allowed</h3>
                  <ul className="rules-list">
                    <li>Misleading claims or "guaranteed profits"</li>
                    <li>Impersonating Market Warrior Club</li>
                    <li>Using unapproved coupon/discount codes</li>
                    <li>Bidding on "MarketWarrior" in paid ads</li>
                    <li>Self-referrals (immediate termination)</li>
                    <li>Spam or unsolicited messages</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Tracking Disclaimer */}
            <div className="disclaimer-box">
              <h4>⚠️ Tracking Notice</h4>
              <p>
                Referral tracking uses cookies and may be affected by ad blockers, browser privacy settings, VPNs, or device changes. A referral is credited only when properly tracked by PromoteKit. We're not responsible for unattributed sales due to technical limitations.
              </p>
            </div>

            {/* Final CTA */}
            <div className="final-cta">
              <h2>Start Earning Today</h2>
              <p>Join the student affiliate programme and turn your course experience into extra income.</p>
              <a href="https://affiliates.marketwarrior.club/signup?campaign=4683" className="cta-primary">
                Join Student Programme
              </a>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link href="/" className="footer-link">Home</Link>
            <Link href="/dashboard" className="footer-link">Dashboard</Link>
            <Link href="/affiliate-terms" className="footer-link">Affiliate Terms</Link>
            <Link href="/terms" className="footer-link">Terms of Service</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <a href="https://affiliates.marketwarrior.club/login" className="footer-link">Affiliate Login</a>
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} Market Warrior Club. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
