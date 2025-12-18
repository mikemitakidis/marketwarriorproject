import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Free Trading Journal - Lead generation tool
 *
 * This version of the journal is accessible without payment.
 * Users can sign up with email or Google and track trades.
 * Entries are stored in `leads_journal_entries` table.
 */
export default function FreeJournalPage() {
  const [email, setEmail] = useState('');
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ symbol: '', direction: 'buy', result: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // Get initial session using Supabase v2 method
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load entries when session changes
  useEffect(() => {
    async function loadEntries() {
      if (!session) return;
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('leads_journal_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setEntries(data || []);
      }
    }
    loadEntries();
  }, [session]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Unable to connect. Please refresh.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/free-journal`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email for the sign-in link!');
      setEmail('');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Unable to connect. Please refresh.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/free-journal`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setEntries([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symbol.trim() || !form.direction) return;

    setLoading(true);
    setError('');

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Unable to connect. Please refresh.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('leads_journal_entries')
      .insert({
        user_id: session.user.id,
        email: session.user.email,
        symbol: form.symbol.trim().toUpperCase(),
        direction: form.direction,
        result: form.result.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setEntries([data, ...entries]);
      setForm({ symbol: '', direction: 'buy', result: '' });
      setSuccess('Entry added!');
      setTimeout(() => setSuccess(''), 3000);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <>
        <Head>
          <title>Free Trading Journal - Market Warrior</title>
        </Head>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: white;
            min-height: 100vh;
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Free Trading Journal - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: white;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: #667eea;
          text-decoration: none;
        }
        .header-actions { display: flex; gap: 12px; align-items: center; }
        .user-email { color: #94a3b8; font-size: 0.875rem; }
        .btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { background: #334155; }
        .btn-google { background: #ea4335; }
        .btn-logout { background: #ef4444; padding: 8px 16px; font-size: 0.875rem; }
        .container { max-width: 800px; margin: 0 auto; padding: 24px; }
        .hero {
          text-align: center;
          padding: 40px 20px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border-radius: 16px;
          margin-bottom: 32px;
        }
        .hero h1 { font-size: 2.5rem; margin-bottom: 12px; }
        .hero p { color: #94a3b8; font-size: 1.1rem; max-width: 500px; margin: 0 auto; }
        .auth-card {
          background: #1e293b;
          padding: 32px;
          border-radius: 12px;
          max-width: 400px;
          margin: 0 auto;
        }
        .auth-card h2 { margin-bottom: 24px; text-align: center; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 8px; color: #94a3b8; }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 1rem;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color: #667eea;
          outline: none;
        }
        .or-divider {
          text-align: center;
          color: #64748b;
          margin: 20px 0;
          position: relative;
        }
        .or-divider::before,
        .or-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #334155;
        }
        .or-divider::before { left: 0; }
        .or-divider::after { right: 0; }
        .message { padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        .message.error { background: #991b1b; color: #fecaca; }
        .message.success { background: #166534; color: #bbf7d0; }
        .journal-section {
          background: #1e293b;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .journal-header {
          padding: 16px 24px;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .journal-header h2 { color: #667eea; margin: 0; }
        .entry-form {
          padding: 20px 24px;
          background: #0f172a;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .entry-form .form-group { flex: 1; min-width: 120px; margin: 0; }
        .entry-form .form-group label { font-size: 0.75rem; }
        .entries-list { padding: 0; }
        .entry-item {
          padding: 16px 24px;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .entry-item:last-child { border-bottom: none; }
        .entry-symbol { font-weight: 600; font-size: 1.1rem; }
        .entry-direction {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .entry-direction.buy { background: #166534; color: #bbf7d0; }
        .entry-direction.sell { background: #991b1b; color: #fecaca; }
        .entry-result { color: #94a3b8; }
        .entry-date { color: #64748b; font-size: 0.875rem; }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        }
        .upgrade-banner {
          background: linear-gradient(135deg, #667eea, #764ba2);
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          margin-top: 32px;
        }
        .upgrade-banner h3 { margin-bottom: 8px; }
        .upgrade-banner p { margin-bottom: 16px; opacity: 0.9; }
      `}</style>

      <header className="header">
        <Link href="/" className="logo">Market Warrior</Link>
        <div className="header-actions">
          {session && (
            <>
              <span className="user-email">{session.user.email}</span>
              <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </header>

      <div className="container">
        <div className="hero">
          <h1>Free Trading Journal</h1>
          <p>Track your trades, learn from your decisions, and improve your trading skills.</p>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {!session ? (
          <div className="auth-card">
            <h2>Get Started</h2>
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Sign-In Link'}
              </button>
            </form>
            <div className="or-divider">or</div>
            <button className="btn btn-google" style={{ width: '100%' }} onClick={handleGoogle}>
              Continue with Google
            </button>
          </div>
        ) : (
          <>
            <div className="journal-section">
              <div className="journal-header">
                <h2>Add Trade</h2>
              </div>
              <form className="entry-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Symbol</label>
                  <input
                    type="text"
                    placeholder="AAPL"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Direction</label>
                  <select
                    value={form.direction}
                    onChange={(e) => setForm({ ...form, direction: e.target.value })}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Result</label>
                  <input
                    type="text"
                    placeholder="Win/Loss"
                    value={form.result}
                    onChange={(e) => setForm({ ...form, result: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </form>
            </div>

            <div className="journal-section">
              <div className="journal-header">
                <h2>Your Trades</h2>
                <span style={{ color: '#64748b' }}>{entries.length} entries</span>
              </div>
              {entries.length === 0 ? (
                <div className="empty-state">
                  <p>No trades logged yet. Start tracking!</p>
                </div>
              ) : (
                <div className="entries-list">
                  {entries.map((entry) => (
                    <div key={entry.id} className="entry-item">
                      <div>
                        <span className="entry-symbol">{entry.symbol}</span>
                        <span className={`entry-direction ${entry.direction}`} style={{ marginLeft: '12px' }}>
                          {entry.direction}
                        </span>
                      </div>
                      <div>
                        {entry.result && <span className="entry-result">{entry.result}</span>}
                        <span className="entry-date" style={{ marginLeft: '16px' }}>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="upgrade-banner">
              <h3>Want More Features?</h3>
              <p>Get access to the full trading journal with P&L tracking, charts, and the complete 30-day trading course!</p>
              <Link href="/register" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Upgrade Now
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
