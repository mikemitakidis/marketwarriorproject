import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
const { getUserFromRequest, getGateStatus } = require('../lib/serverAuth');

/**
 * Welcome / Onboarding page.
 *
 * Users land here after payment to enter their name and accept terms
 * before accessing the dashboard. This is a required step in the flow:
 * Register -> Confirm Email -> Payment -> Welcome -> Dashboard
 */
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

    // If already completed welcome, go to dashboard
    if (gate.welcomeCompleted) {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    return { props: { userEmail: user.email } };
  } catch (err) {
    console.error('Welcome SSR error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function WelcomePage({ userEmail }) {
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

  return (
    <>
      <Head>
        <title>Welcome to Market Warrior Challenge</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
        .logo { font-size: 80px; margin-bottom: 20px; }
        h1 { font-size: 2.5em; margin-bottom: 15px; }
        .subtitle { font-size: 1.2em; opacity: 0.95; }
        .content { padding: 50px 40px; }
        .welcome-message {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
          border-left: 5px solid #fbbf24;
        }
        .welcome-message h2 { color: #92400e; margin-bottom: 15px; }
        .welcome-message p { color: #78350f; line-height: 1.8; }
        .name-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
        }
        .name-section h3 { color: #1e293b; margin-bottom: 20px; }
        .name-input input {
          width: 100%;
          padding: 15px 20px;
          border: 2px solid #cbd5e1;
          border-radius: 10px;
          font-size: 1.1em;
          margin-top: 10px;
        }
        .name-input input:focus { outline: none; border-color: #667eea; }
        .warning-box {
          background: #fee2e2;
          border: 2px solid #ef4444;
          padding: 20px;
          border-radius: 15px;
          margin-top: 20px;
        }
        .warning-box strong { color: #991b1b; }
        .terms-section { margin: 40px 0; }
        .terms-section h3 { color: #1e293b; margin-bottom: 25px; font-size: 1.8em; }
        .term-item {
          background: white;
          border: 2px solid #e2e8f0;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }
        .term-item h4 { color: #667eea; margin-bottom: 15px; font-size: 1.3em; }
        .term-item ul { list-style: none; padding-left: 0; }
        .term-item li {
          padding: 8px 0 8px 25px;
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
        .agreement-section h3 { color: #1e293b; margin-bottom: 25px; }
        .checkbox-item {
          padding: 15px;
          margin: 15px 0;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: flex-start;
          gap: 15px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
          cursor: pointer;
        }
        .checkbox-item:hover { border-color: #667eea; }
        .checkbox-item input[type="checkbox"] {
          width: 24px;
          height: 24px;
          margin-top: 3px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .checkbox-item label {
          flex: 1;
          cursor: pointer;
          color: #475569;
          line-height: 1.6;
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
          .content { padding: 30px 20px; }
          h1 { font-size: 2em; }
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
              <p>We <strong>strongly recommend</strong> using only <span className="highlight">demo/virtual accounts</span> during this challenge.</p>
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
                <li>Contact support@marketwarrior.club for refunds</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>3. 120-Day Access Period</h4>
              <p>You have <span className="highlight">120 days (4 months)</span> of platform access starting from today.</p>
              <ul>
                <li>Access starts from payment date</li>
                <li>Complete the 30-day challenge at your own pace</li>
                <li>Certificate remains valid forever</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>4. Risk Disclosure</h4>
              <p>Trading and investing carry significant risk.</p>
              <ul>
                <li>You can lose 100% of your investment</li>
                <li>Only trade with money you can afford to lose</li>
                <li>No guarantees of profit or success</li>
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
