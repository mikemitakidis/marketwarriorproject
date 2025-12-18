'use client'

export default function PrivacyPage() {
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
        ul {
          margin-left: 25px;
        }
        .highlight {
          background: #f0fdf4;
          padding: 20px;
          border-radius: 10px;
          margin: 30px 0;
          border-left: 4px solid #10b981;
        }
        .highlight strong {
          color: #065f46;
        }
        .back-link {
          display: inline-block;
          margin-top: 40px;
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }
        .back-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="header">
        <a href="/">Market Warrior</a>
      </div>

      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="updated">Last Updated: December 2024</p>

        <p>Market Warrior (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly to us:</p>
        <ul>
          <li><strong>Account Information:</strong> Name, email address, and password</li>
          <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store card details)</li>
          <li><strong>Progress Data:</strong> Quiz scores, task submissions, completion status</li>
          <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and maintain our educational services</li>
          <li>Process your payments and manage your account</li>
          <li>Track your progress through the course</li>
          <li>Generate your certificate of completion</li>
          <li>Communicate with you about your account</li>
          <li>Improve our platform and content</li>
          <li>Process affiliate commissions</li>
        </ul>

        <h2>3. Data Storage &amp; Security</h2>
        <div className="highlight">
          <strong>🔒 Your Data is Secure</strong>
          <p>We use industry-standard security measures including encryption, secure servers, and regular security audits to protect your data.</p>
        </div>
        <p>Your data is stored securely using:</p>
        <ul>
          <li><strong>Supabase:</strong> For user authentication and data storage</li>
          <li><strong>Stripe:</strong> For payment processing (PCI compliant)</li>
          <li><strong>Vercel:</strong> For secure hosting</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>We do not sell your personal information. We may share data with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Companies that help us operate (Stripe, Supabase, email services)</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
        </ul>

        <h2>5. Cookies &amp; Tracking</h2>
        <p>We use essential cookies to:</p>
        <ul>
          <li>Keep you logged in</li>
          <li>Remember your preferences</li>
          <li>Track course progress</li>
        </ul>
        <p>We may use analytics to understand how users interact with our platform.</p>

        <h2>6. Your Rights (GDPR &amp; International)</h2>
        <div className="highlight">
          <strong>🇪🇺 GDPR Compliant:</strong>
          <p>We comply with the EU General Data Protection Regulation (GDPR) and respect the data privacy rights of all users worldwide.</p>
        </div>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you</li>
          <li><strong>Right to Rectification:</strong> Request correction of any inaccurate or incomplete data</li>
          <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
          <li><strong>Right to Data Portability:</strong> Receive your data in a commonly used format</li>
          <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
          <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
        </ul>
        <p><strong>How to Exercise Your Rights:</strong></p>
        <p>Contact our Data Protection team at <strong>support@marketwarrior.club</strong>.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your data for:</p>
        <ul>
          <li>Active accounts: Duration of account plus 2 years</li>
          <li>Certificates: Permanently (as proof of completion)</li>
          <li>Payment records: As required by law (typically 7 years)</li>
        </ul>

        <h2>8. Children&apos;s Privacy</h2>
        <p>Our services are not intended for individuals under 18 years of age.</p>

        <h2>9. Contact Us</h2>
        <p>For questions about this Privacy Policy:</p>
        <p><strong>Email:</strong> support@marketwarrior.club</p>

        <a href="/" className="back-link">← Back to Home</a>
      </div>
    </>
  )
}
