import { useState } from 'react';
import Head from 'next/head';

/**
 * Development bypass page - ONLY FOR TESTING
 *
 * This page allows bypassing payment in development mode.
 * In production, this should be disabled or protected.
 */
export default function DevBypassPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleBypass = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/dev/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Access granted to ${email}! You can now login.` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to grant access' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Dev Bypass - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fef3c7;
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
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          max-width: 500px;
          width: 100%;
        }
        .warning {
          background: #fee2e2;
          color: #dc2626;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        h1 { color: #1e293b; margin-bottom: 10px; }
        .subtitle { color: #64748b; margin-bottom: 24px; }
        .form-group { margin-bottom: 16px; }
        label { display: block; margin-bottom: 6px; color: #374151; font-weight: 500; }
        input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
        }
        input:focus { outline: none; border-color: #f59e0b; }
        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          background: #f59e0b;
          color: white;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          text-align: center;
        }
        .message.error { background: #fef2f2; color: #dc2626; }
        .message.success { background: #f0fdf4; color: #16a34a; }
        .links { margin-top: 20px; text-align: center; }
        .links a { color: #f59e0b; text-decoration: none; margin: 0 10px; }
      `}</style>

      <div className="container">
        <div className="warning">
          DEV MODE ONLY - This page bypasses payment for testing
        </div>

        <h1>Grant Test Access</h1>
        <p className="subtitle">Enter an email to grant full access without payment</p>

        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        <form onSubmit={handleBypass}>
          <div className="form-group">
            <label>User Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Granting Access...' : 'Grant Access (Bypass Payment)'}
          </button>
        </form>

        <div className="links">
          <a href="/login">Go to Login</a>
          <a href="/">Back to Home</a>
        </div>
      </div>
    </>
  );
}
