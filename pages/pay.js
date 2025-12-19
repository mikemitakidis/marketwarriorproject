import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus } from '../lib/serverAuth';

/**
 * Payment page.
 *
 * Displays the Stripe checkout for users who have registered but not paid.
 * Flow: Register -> Confirm Email -> Payment (this page) -> Welcome -> Dashboard
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);

    // If already paid, redirect to next step
    if (gate.hasPaid) {
      if (!gate.welcomeCompleted) {
        return { redirect: { destination: '/welcome', permanent: false } };
      }
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    return { props: { userEmail: user.email } };
  } catch (err) {
    console.error('Pay page SSR error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function PayPage({ userEmail }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripe, setStripe] = useState(null);

  useEffect(() => {
    // Load Stripe.js
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (stripeKey && window.Stripe) {
        setStripe(window.Stripe(stripeKey));
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleCheckout = async () => {
    if (!stripe) {
      setError('Payment system is loading. Please wait...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.id,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Complete Your Purchase - Market Warrior</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
      `}</style>

      <style jsx>{`
        .container {
          background: white;
          padding: 50px;
          border-radius: 25px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          max-width: 500px;
          width: 100%;
          text-align: center;
        }
        .logo {
          width: 100px;
          height: auto;
          margin-bottom: 20px;
          border-radius: 15px;
        }
        h1 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 2em;
        }
        .subtitle {
          color: #64748b;
          margin-bottom: 30px;
        }
        .price-box {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
        }
        .price {
          font-size: 3em;
          font-weight: 700;
          color: #92400e;
        }
        .price-label {
          color: #78350f;
          font-weight: 600;
        }
        .features {
          text-align: left;
          margin-bottom: 30px;
        }
        .feature {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .feature:last-child {
          border-bottom: none;
        }
        .check {
          color: #10b981;
          font-size: 1.2em;
        }
        .btn {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 12px;
          font-size: 1.2em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 15px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .guarantee {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #64748b;
          font-size: 0.9em;
          margin-top: 20px;
        }
        .error {
          background: #fee2e2;
          color: #dc2626;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .user-email {
          color: #64748b;
          font-size: 0.9em;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .container { padding: 30px 20px; }
          h1 { font-size: 1.6em; }
          .price { font-size: 2.5em; }
        }
      `}</style>

      <div className="container">
        <img src="/logo.png" alt="Market Warrior" className="logo" />
        <h1>Complete Your Purchase</h1>
        <p className="subtitle">You're one step away from starting your trading journey!</p>

        <p className="user-email">Logged in as: {userEmail}</p>

        {error && <div className="error">{error}</div>}

        <div className="price-box">
          <div className="price">$39.99</div>
          <div className="price-label">One-time payment</div>
        </div>

        <div className="features">
          <div className="feature">
            <span className="check">✓</span>
            <span>30-day trading challenge with daily lessons</span>
          </div>
          <div className="feature">
            <span className="check">✓</span>
            <span>Quizzes and practical tasks</span>
          </div>
          <div className="feature">
            <span className="check">✓</span>
            <span>Certificate of completion</span>
          </div>
          <div className="feature">
            <span className="check">✓</span>
            <span>Access to community forum</span>
          </div>
          <div className="feature">
            <span className="check">✓</span>
            <span>120 days of access</span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCheckout}
          disabled={loading || !stripe}
        >
          {loading ? 'Loading...' : !stripe ? 'Initializing...' : 'Proceed to Checkout'}
        </button>

        <div className="guarantee">
          <span>🛡️</span>
          <span>3-day money-back guarantee</span>
        </div>
      </div>
    </>
  );
}
