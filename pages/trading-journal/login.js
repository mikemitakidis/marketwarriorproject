import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

/**
 * TRADING JOURNAL LOGIN/REGISTER
 * Completely separate from the course authentication.
 */
export default function JournalLoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      setSupabase(createClient(url, key));
    }

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true') setMode('register');
    if (params.get('error')) setMessage({ type: 'error', text: 'Authentication failed. Please try again.' });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase || !email || !password) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      // Set Trading Journal session (separate from course)
      const res = await fetch('/api/journal/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Session error');

      setMessage({ type: 'success', text: 'Success! Redirecting...' });
      window.location.href = '/trading-journal';

    } catch (err) {
      console.error('Login error:', err);
      setMessage({ type: 'error', text: err.message || 'Login failed' });
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!supabase || !email || !password) return;

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/trading-journal/auth-callback`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim() || null,
            source: 'trading_journal',
          },
        },
      });

      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        setMessage({ type: 'error', text: 'Email already registered. Please login.' });
        setMode('login');
      } else {
        setMessage({ type: 'success', text: 'Check your email to confirm your account!' });
      }

    } catch (err) {
      console.error('Register error:', err);
      setMessage({ type: 'error', text: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!supabase || !email) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${appUrl}/trading-journal/auth-callback?type=recovery`,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Check your email for reset link!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to send reset email' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!supabase) return;
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${appUrl}/trading-journal/auth-callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Google sign-in failed' });
    }
  };

  return (
    <>
      <Head>
        <title>{mode === 'register' ? 'Register' : 'Login'} - Trading Journal</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1e2e 100%);
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
          padding: 50px 45px;
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          max-width: 480px;
          width: 100%;
        }
        .logo {
          text-align: center;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }
        h1 { text-align: center; color: #1e293b; margin-bottom: 8px; font-size: 1.8rem; }
        .subtitle { text-align: center; color: #64748b; margin-bottom: 28px; font-size: 1rem; }
        .tabs {
          display: flex;
          margin-bottom: 24px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
        }
        .tab {
          flex: 1;
          padding: 12px;
          border: none;
          background: white;
          cursor: pointer;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }
        .tab.active {
          background: #667eea;
          color: white;
        }
        .form-group { margin-bottom: 18px; }
        label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-weight: 500;
          font-size: 0.9rem;
        }
        input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        .btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .divider span { padding: 0 12px; }
        .google-btn {
          width: 100%;
          padding: 12px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
        }
        .google-btn:hover {
          border-color: #667eea;
          background: #f8fafc;
        }
        .message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 18px;
          font-size: 0.9rem;
        }
        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .message.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .forgot {
          text-align: center;
          margin-top: 16px;
        }
        .forgot button {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .forgot button:hover { text-decoration: underline; }
        .course-link {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .course-link a {
          color: #64748b;
          font-size: 0.85rem;
          text-decoration: none;
        }
        .course-link a:hover { color: #667eea; }
      `}</style>

      <div className="container">
        <div className="logo">
          <div className="logo-icon">MW</div>
        </div>
        <h1>Trading Journal</h1>
        <p className="subtitle">Track your trades, improve your performance</p>

        {mode !== 'reset' && (
          <div className="tabs">
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
              Login
            </button>
            <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
              Register
            </button>
          </div>
        )}

        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="forgot">
              <button type="button" onClick={() => setMode('reset')}>Forgot password?</button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name (optional)</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="forgot">
              <button type="button" onClick={() => setMode('login')}>Back to login</button>
            </div>
          </form>
        )}

        {mode !== 'reset' && (
          <>
            <div className="divider"><span>or</span></div>
            <button type="button" className="google-btn" onClick={handleGoogle}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div className="course-link">
          <a href="/login">Looking for the 30-Day Trading Course? Login here</a>
        </div>
      </div>
    </>
  );
}
