'use client'

export default function TermsPage() {
  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.7;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          text-align: center;
        }
        .header a {
          color: white;
          text-decoration: none;
          font-size: 1.5em;
          font-weight: 700;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 50px 20px;
        }
        h1 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 2.5em;
        }
        .updated {
          color: #64748b;
          margin-bottom: 40px;
        }
        h2 {
          color: #667eea;
          margin: 40px 0 20px;
          font-size: 1.5em;
        }
        p, li {
          margin-bottom: 15px;
          color: #475569;
        }
        ul { margin-left: 25px; }
        .highlight {
          background: #fef3c7;
          padding: 20px;
          border-radius: 10px;
          margin: 30px 0;
          border-left: 4px solid #f59e0b;
        }
        .highlight strong { color: #92400e; }
        .back-link {
          display: inline-block;
          margin-top: 40px;
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }
        .back-link:hover { text-decoration: underline; }
      `}</style>

      <div className="header">
        <a href="/">Market Warrior</a>
      </div>

      <div className="container">
        <h1>Terms of Service</h1>
        <p className="updated">Last Updated: December 2024</p>

        <p>Welcome to Market Warrior. By accessing or using our platform, you agree to be bound by these Terms of Service.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By purchasing or accessing the Market Warrior 30-Day Trading Challenge, you agree to these terms.</p>

        <h2>2. Educational Purpose Only</h2>
        <div className="highlight">
          <strong>⚠️ Important Disclaimer:</strong>
          <p>Market Warrior provides educational content only. We are NOT financial advisors. Our content does not constitute investment advice.</p>
        </div>

        <h2>3. Demo Trading Recommendation</h2>
        <p>We strongly recommend practicing with demo/virtual accounts for a minimum of 6 months before considering real money trading.</p>

        <h2>4. Account Access</h2>
        <ul>
          <li>120 days (4 months) of platform access</li>
          <li>Maximum of 2 devices</li>
          <li>No account sharing</li>
          <li>Certificate is yours forever once earned</li>
        </ul>

        <h2>5. Refund Policy</h2>
        <ul>
          <li>Full refund available within 3 days of purchase</li>
          <li>Contact support@marketwarrior.club</li>
          <li>Refunds processed within 5-10 business days</li>
        </ul>

        <h2>6. Content Protection</h2>
        <p>All course materials are protected by copyright. You agree not to:</p>
        <ul>
          <li>Copy, reproduce, or distribute content</li>
          <li>Record or screenshot video lessons</li>
          <li>Share access credentials</li>
          <li>Resell or redistribute materials</li>
        </ul>

        <h2>7. Affiliate Program</h2>
        <ul>
          <li>30% commission on referrals</li>
          <li>7-day hold period</li>
          <li>$50 minimum payout threshold</li>
        </ul>

        <h2>8. Limitation of Liability</h2>
        <p>Market Warrior shall not be liable for any damages resulting from use of our services or trading decisions made based on our content.</p>

        <h2>9. GDPR Compliance</h2>
        <div className="highlight">
          <strong>🔒 Your Data is Protected:</strong>
          <p>We comply with GDPR and international data protection laws.</p>
        </div>
        <p>Your Rights:</p>
        <ul>
          <li>Right to Access your data</li>
          <li>Right to Rectification</li>
          <li>Right to Erasure</li>
          <li>Right to Data Portability</li>
        </ul>
        <p>Contact: support@marketwarrior.club</p>

        <h2>10. Contact</h2>
        <p><strong>Email:</strong> support@marketwarrior.club</p>

        <a href="/" className="back-link">← Back to Home</a>
      </div>
    </>
  )
}
