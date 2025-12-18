import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus } from '../lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);

    // If not paid, redirect to payment
    if (!gate.hasPaid) {
      return { redirect: { destination: '/pay', permanent: false } };
    }

    // If already completed welcome (terms accepted), go to dashboard
    if (gate.welcomeCompleted) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    // Get user's affiliate code
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('affiliate_code')
      .eq('id', user.id)
      .single();

    return {
      props: {
        userEmail: user.email,
        affiliateCode: profile?.affiliate_code || ''
      }
    };
  } catch (err) {
    console.error('Welcome SSR error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function WelcomePage({ userEmail, affiliateCode }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [agreements, setAgreements] = useState({
    terms: false,
    education: false,
    namePermanent: false,
    accessPeriod: false,
    risk: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyText, setCopyText] = useState('Copy');

  const allAgreed = Object.values(agreements).every(Boolean) && fullName.trim().length >= 2;

  const handleCheckbox = (key) => {
    setAgreements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!allAgreed) return;

    const confirmed = window.confirm(
      `Confirm your name: "${fullName.trim()}"\n\n` +
      `This will appear on your certificate and CANNOT be changed later.\n\n` +
      `Is this correct?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/welcome/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName: fullName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      router.push(data.next || '/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    const link = `https://marketwarrior.club/?ref=${affiliateCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopyText('✓ Copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    }).catch(() => {
      alert('Failed to copy. Please copy manually.');
    });
  };

  return (
    <>
      <Head>
        <title>Welcome to Market Warrior Challenge</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
      `}</style>

      <style jsx>{`
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 30px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.3);
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 50px 40px;
          text-align: center;
        }

        .logo {
          font-size: 80px;
          margin-bottom: 20px;
        }

        h1 {
          font-size: 2.5em;
          margin-bottom: 15px;
        }

        .subtitle {
          font-size: 1.2em;
          opacity: 0.95;
        }

        .content {
          padding: 50px 40px;
        }

        .welcome-message {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
          border-left: 5px solid #fbbf24;
        }

        .welcome-message h2 {
          color: #92400e;
          margin-bottom: 15px;
        }

        .welcome-message p {
          color: #78350f;
          line-height: 1.8;
        }

        .name-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
        }

        .name-section h3 {
          color: #1e293b;
          margin-bottom: 20px;
        }

        .name-input {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        .name-input input {
          flex: 1;
          padding: 15px 20px;
          border: 2px solid #cbd5e1;
          border-radius: 10px;
          font-size: 1.1em;
        }

        .name-input input:focus {
          outline: none;
          border-color: #667eea;
        }

        .warning-box {
          background: #fee2e2;
          border: 2px solid #ef4444;
          padding: 20px;
          border-radius: 15px;
          margin-top: 20px;
        }

        .warning-box strong {
          color: #991b1b;
        }

        .terms-section {
          margin: 40px 0;
        }

        .terms-section h3 {
          color: #1e293b;
          margin-bottom: 25px;
          font-size: 1.8em;
        }

        .term-item {
          background: white;
          border: 2px solid #e2e8f0;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }

        .term-item h4 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 1.3em;
        }

        .term-item ul {
          list-style: none;
          padding-left: 0;
        }

        .term-item li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
          color: #475569;
          line-height: 1.6;
        }

        .term-item li:before {
          content: "•";
          position: absolute;
          left: 5px;
          color: #667eea;
          font-weight: 700;
        }

        .highlight {
          background: #fef3c7;
          padding: 3px 8px;
          border-radius: 5px;
          font-weight: 600;
          color: #92400e;
        }

        .agreement-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin: 40px 0;
        }

        .agreement-section h3 {
          color: #1e293b;
          margin-bottom: 25px;
        }

        .checkbox-item {
          padding: 15px;
          margin: 15px 0;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: start;
          gap: 15px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
          cursor: pointer;
        }

        .checkbox-item:hover {
          border-color: #667eea;
        }

        .checkbox-item input[type="checkbox"] {
          width: 24px;
          height: 24px;
          margin-top: 3px;
          cursor: pointer;
        }

        .checkbox-item label {
          flex: 1;
          cursor: pointer;
          color: #475569;
          line-height: 1.6;
        }

        .affiliate-section {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin: 40px 0;
          text-align: center;
        }

        .affiliate-section h3 {
          color: #92400e;
          margin-bottom: 20px;
        }

        .commission-badge {
          display: inline-block;
          background: white;
          padding: 20px 40px;
          border-radius: 15px;
          margin: 20px 0;
        }

        .commission-rate {
          font-size: 3em;
          font-weight: 700;
          color: #92400e;
        }

        .commission-text {
          color: #78350f;
          font-weight: 600;
        }

        .affiliate-link {
          background: white;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .affiliate-link input {
          flex: 1;
          padding: 10px;
          border: 2px solid #fbbf24;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          background: #fef3c7;
        }

        .copy-button {
          padding: 10px 20px;
          background: #fbbf24;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .copy-button:hover {
          background: #f59e0b;
        }

        .start-button {
          width: 100%;
          padding: 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 1.3em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 30px;
        }

        .start-button:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .start-button:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 15px;
          border-radius: 10px;
          margin-top: 20px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .content {
            padding: 30px 20px;
          }

          h1 {
            font-size: 2em;
          }

          .name-input {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="logo">🎉</div>
          <h1>Welcome, Market Warrior!</h1>
          <p className="subtitle">Your trading journey starts here</p>
        </div>

        <div className="content">
          <div className="welcome-message">
            <h2>🏆 Congratulations on Your Purchase!</h2>
            <p>You've just taken the first step towards becoming a confident, professional trader. Over the next 30 days, you'll learn everything you need to start trading successfully.</p>
            <p style={{ marginTop: '15px' }}><strong>What happens next:</strong> After accepting the terms below, Day 1 will unlock immediately. Each subsequent day unlocks automatically after 24 hours.</p>
          </div>

          <div className="name-section">
            <h3>📝 Enter Your Full Name</h3>
            <p>This name will appear on your Certificate of Completion at the end of the challenge.</p>

            <div className="name-input">
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="warning-box">
              <strong>⚠️ IMPORTANT:</strong> Your name cannot be changed later. Make sure it's spelled correctly!
            </div>
          </div>

          <div className="terms-section">
            <h3>📋 Terms & Conditions</h3>
            <p style={{ marginBottom: '20px', color: '#64748b' }}>Please read carefully before proceeding</p>

            <div className="term-item">
              <h4>1. Virtual Trading Recommendation</h4>
              <p>We <strong>strongly recommend</strong> using only <span className="highlight">demo/virtual accounts</span> during this challenge. Practice with virtual money until you're consistently profitable for at least 6 months.</p>
              <ul>
                <li>All lessons are designed for demo account practice</li>
                <li>Never risk real money until you're ready</li>
                <li>We are not responsible for any trading losses</li>
                <li>This is education, not financial advice</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>2. 3-Day Refund Policy</h4>
              <p>You have <span className="highlight">3 days from purchase</span> to request a full refund, no questions asked.</p>
              <ul>
                <li>Refund requests must be made within 72 hours</li>
                <li>After 3 days, all sales are final</li>
                <li>Refunds processed within 5-7 business days</li>
                <li>Contact support@marketwarrior.club for refunds</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>3. Device Limitations</h4>
              <p>Your account can be used on <span className="highlight">up to 2 devices</span> (laptop, desktop, mobile, tablet).</p>
              <ul>
                <li>Maximum 2 devices allowed per account</li>
                <li>Devices are automatically registered on first login</li>
                <li>Contact support to reset devices if needed</li>
                <li>Account sharing is prohibited</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>4. 120-Day Access Period</h4>
              <p>You have <span className="highlight">120 days (4 months)</span> of platform access starting from today.</p>
              <ul>
                <li>Access starts from payment date</li>
                <li>Complete the 30-day challenge at your own pace</li>
                <li>Access automatically expires after 120 days</li>
                <li>Certificate remains valid forever</li>
                <li>No extensions after 120 days</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>5. Name Cannot Be Changed</h4>
              <p>The name you enter below is <span className="highlight">permanent</span> and will be used for:</p>
              <ul>
                <li>Your certificate of completion</li>
                <li>Community forum posts</li>
                <li>All official documentation</li>
                <li>Cannot be changed after submission</li>
                <li>Double-check spelling before submitting</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>6. Content Protection</h4>
              <p>All course materials are copyrighted and protected.</p>
              <ul>
                <li>Do not share, copy, or distribute course content</li>
                <li>Screenshots and recording are prohibited</li>
                <li>For personal use only</li>
                <li>Violations may result in account termination</li>
                <li>No refund if account is terminated for violations</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>7. Challenge Structure</h4>
              <p>The challenge operates on a <span className="highlight">time-based unlock system</span>.</p>
              <ul>
                <li>Day 1 unlocks immediately upon agreement</li>
                <li>Day 2 unlocks 24 hours after Day 1</li>
                <li>Each day unlocks automatically (no action needed)</li>
                <li>You must complete quizzes (60%+) to proceed</li>
                <li>You must submit tasks to proceed to next day</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>8. Educational Disclaimer</h4>
              <p>This is an <span className="highlight">educational program</span>, not financial advice.</p>
              <ul>
                <li>Content is for educational purposes only</li>
                <li>Not personalized financial or investment advice</li>
                <li>Trading involves risk of loss</li>
                <li>Past performance doesn't guarantee future results</li>
                <li>Consult a licensed financial advisor before trading real money</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>9. Community Guidelines</h4>
              <p>When participating in the community forum:</p>
              <ul>
                <li>Be respectful to other members</li>
                <li>No spam or promotional content</li>
                <li>No financial advice or "hot tips"</li>
                <li>Admin reserves right to moderate/remove content</li>
                <li>Violations may result in forum ban</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>10. Risk Disclosure</h4>
              <p>Trading and investing carry significant risk.</p>
              <ul>
                <li>You can lose 100% of your investment</li>
                <li>Only trade with money you can afford to lose</li>
                <li>Market Warrior is not liable for any losses</li>
                <li>No guarantees of profit or success</li>
                <li>Your results will vary based on your decisions</li>
              </ul>
            </div>
          </div>

          <div className="agreement-section">
            <h3>✅ I Agree To:</h3>

            <div className="checkbox-item" onClick={() => handleCheckbox('terms')}>
              <input type="checkbox" checked={agreements.terms} onChange={() => {}} />
              <label>I have read and agree to all Terms & Conditions above</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('education')}>
              <input type="checkbox" checked={agreements.education} onChange={() => {}} />
              <label>I understand this is education only, not financial advice, and I will use demo accounts</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('namePermanent')}>
              <input type="checkbox" checked={agreements.namePermanent} onChange={() => {}} />
              <label>I understand my name is permanent and cannot be changed after submission</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('accessPeriod')}>
              <input type="checkbox" checked={agreements.accessPeriod} onChange={() => {}} />
              <label>I understand I have 120 days of access and 3 days for refunds</label>
            </div>

            <div className="checkbox-item" onClick={() => handleCheckbox('risk')}>
              <input type="checkbox" checked={agreements.risk} onChange={() => {}} />
              <label>I understand trading involves risk and I may lose money</label>
            </div>
          </div>

          <div className="affiliate-section">
            <h3>💰 Your Affiliate Link</h3>
            <p style={{ color: '#78350f', marginBottom: '15px' }}>
              Share your unique link and earn passive income!
            </p>

            <div className="commission-badge">
              <div className="commission-rate">30%</div>
              <p className="commission-text">Commission Per Sale</p>
            </div>

            <p style={{ color: '#78350f', fontSize: '0.95em' }}>
              You get <strong>30% commission</strong> (5% bonus over base 25%) for every person who signs up through your link!
            </p>

            <div className="affiliate-link">
              <input
                type="text"
                value={`https://marketwarrior.club/?ref=${affiliateCode || 'YOUR_CODE'}`}
                readOnly
              />
              <button className="copy-button" onClick={copyAffiliateLink}>{copyText}</button>
            </div>

            <p style={{ color: '#78350f', fontSize: '0.95em' }}>
              Track your earnings in your dashboard. Automatic payouts via Stripe!
            </p>
          </div>

          <button
            className="start-button"
            disabled={!allAgreed || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Saving...' : '🚀 Start My Challenge'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </>
  );
}
