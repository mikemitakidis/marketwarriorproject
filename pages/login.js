import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initialize Supabase client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Supabase URL:', url ? 'SET' : 'MISSING');
    console.log('Supabase Key:', key ? 'SET' : 'MISSING');

    if (url && key) {
      setSupabase(createClient(url, key));
      setReady(true);
    } else {
      setMessage({ type: 'error', text: 'Configuration error. Please contact support.' });
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
      // 1. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      // 2. Set server-side cookies
      const res = await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Session error');

      // 3. Redirect based on user status
      setMessage({ type: 'success', text: 'Success! Redirecting...' });
      window.location.href = json.next || '/dashboard';

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
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // Check if email already exists
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
        <title>{mode === 'register' ? 'Register' : 'Login'} - Market Warrior</title>
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
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          max-width: 420px;
          width: 100%;
        }
        h1 { text-align: center; color: #1e293b; margin-bottom: 8px; }
        .subtitle { text-align: center; color: #64748b; margin-bottom: 24px; }
        .tabs {
          display: flex;
          margin-bottom: 24px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
        }
        .tab {
          flex: 1;
          padding: 12px;
          border: none;
          background: #f8fafc;
          cursor: pointer;
          font-weight: 600;
          color: #64748b;
        }
        .tab.active {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        .form-group { margin-bottom: 16px; }
        label { display: block; margin-bottom: 6px; color: #374151; font-weight: 500; }
        input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
        }
        input:focus { outline: none; border-color: #667eea; }
        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 12px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-google {
          background: white;
          border: 2px solid #e2e8f0;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .divider {
          text-align: center;
          color: #94a3b8;
          margin: 20px 0;
          position: relative;
        }
        .divider::before, .divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #e2e8f0;
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; }
        .message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          text-align: center;
        }
        .message.error { background: #fef2f2; color: #dc2626; }
        .message.success { background: #f0fdf4; color: #16a34a; }
        .links { text-align: center; margin-top: 20px; color: #64748b; }
        .links a { color: #667eea; text-decoration: none; cursor: pointer; }
        .forgot { text-align: right; margin-bottom: 16px; }
        .forgot a { color: #667eea; font-size: 14px; cursor: pointer; }
      `}</style>

      <div className="container">
        <h1>Market Warrior</h1>
        <p className="subtitle">{mode === 'register' ? 'Create your account' : 'Welcome back'}</p>

        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        {!ready && !message.text && <div className="message">Loading...</div>}

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

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="forgot">
              <a onClick={() => setMode('reset')}>Forgot password?</a>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <p style={{ marginBottom: 16, color: '#64748b' }}>Enter your email to receive a reset link.</p>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="links">
              <a onClick={() => setMode('login')}>← Back to Login</a>
            </div>
          </form>
        )}

        {mode !== 'reset' && (
          <>
            <div className="divider">or</div>
            <button className="btn btn-google" onClick={handleGoogle} disabled={!ready}>
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

        <div className="links">
          <p><a href="/">← Back to Home</a></p>
        </div>
      </div>
    </>
  );
}
