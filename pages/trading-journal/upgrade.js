import { useState, useEffect } from 'react';
import Head from 'next/head';
import { getJournalUser, getServiceSupabase, getJournalSettings } from '../../lib/journalAuth';

export async function getServerSideProps({ req, res }) {
  try {
    const user = await getJournalUser(req, res);
    if (!user) {
      return { redirect: { destination: '/trading-journal/login', permanent: false } };
    }

    // Check if user already paid
    if (user.hasPaid) {
      return { redirect: { destination: '/trading-journal', permanent: false } };
    }

    // Check if paid mode is even enabled
    const settings = await getJournalSettings();
    if (!settings.paidEnabled) {
      // Free mode - shouldn't be on this page
      return { redirect: { destination: '/trading-journal', permanent: false } };
    }

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || null,
        },
      },
    };
  } catch (err) {
    console.error('Upgrade page error:', err);
    return { redirect: { destination: '/trading-journal/login', permanent: false } };
  }
}

export default function UpgradePage({ user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/journal/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: 'lifetime' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upgrade - Trading Journal</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          min-height: 100vh;
          color: white;
        }
      `}</style>

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }
        .card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 48px;
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 12px;
        }
        .subtitle {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .price-box {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
        }
        .price {
          font-size: 3rem;
          font-weight: 700;
          color: white;
        }
        .price-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
        }
        .features {
          text-align: left;
          margin-bottom: 32px;
        }
        .feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .feature:last-child {
          border-bottom: none;
        }
        .feature-icon {
          color: #4ade80;
          font-size: 1.2rem;
        }
        .feature-text {
          color: rgba(255, 255, 255, 0.9);
        }
        .upgrade-btn {
          width: 100%;
          padding: 18px 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upgrade-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .upgrade-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .back-link {
          margin-top: 24px;
          color: rgba(255, 255, 255, 0.5);
        }
        .back-link a {
          color: #667eea;
          text-decoration: none;
        }
        .back-link a:hover {
          text-decoration: underline;
        }
        .guarantee {
          margin-top: 24px;
          padding: 16px;
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.2);
          border-radius: 12px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .guarantee strong {
          color: #4ade80;
        }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="icon">📊</div>
          <h1>Upgrade Your Trading</h1>
          <p className="subtitle">
            Get lifetime access to the complete Trading Journal with all premium features.
          </p>

          <div className="price-box">
            <div className="price-label">One-time payment - Lifetime access</div>
          </div>

          <div className="features">
            <div className="feature">
              <span className="feature-icon">+</span>
              <span className="feature-text">Unlimited trade logging</span>
            </div>
            <div className="feature">
              <span className="feature-icon">+</span>
              <span className="feature-text">AI Trading Coach (10 messages/day)</span>
            </div>
            <div className="feature">
              <span className="feature-icon">+</span>
              <span className="feature-text">Advanced analytics & charts</span>
            </div>
            <div className="feature">
              <span className="feature-icon">+</span>
              <span className="feature-text">CSV import & export</span>
            </div>
            <div className="feature">
              <span className="feature-icon">+</span>
              <span className="feature-text">Trading playbook builder</span>
            </div>
            <div className="feature">
              <span className="feature-icon">+</span>
              <span className="feature-text">Goal tracking & challenges</span>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button
            className="upgrade-btn"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Get Lifetime Access'}
          </button>

          <div className="guarantee">
            <strong>30-Day Money-Back Guarantee</strong> - If you're not satisfied, we'll refund your purchase, no questions asked.
          </div>

          <div className="back-link">
            <a href="/trading-journal/login">Back to Login</a>
          </div>
        </div>
      </div>
    </>
  );
}
