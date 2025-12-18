import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

/**
 * Login Page - IDENTICAL to templates/login.html
 */
export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [ready, setReady] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      setSupabase(createClient(url, key));
      setReady(true);
    } else {
      setMessage({ type: 'error', text: 'Configuration error. Please contact support.' });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true') setMode('register');
    if (params.get('affiliate') === 'true') {
      setMode('register');
      setIsAffiliate(true);
    }
    if (params.get('error')) setMessage({ type: 'error', text: 'Authentication failed. Please try again.' });
    if (params.get('reset') === 'true') setMessage({ type: 'success', text: 'Password updated! You can now login with your new password.' });
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

      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      setTimeout(() => {
        window.location.href = json.next || '/dashboard';
      }, 1000);

    } catch (err) {
      console.error('Login error:', err);
      setMessage({ type: 'error', text: err.message || 'Invalid email or password' });
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
      const redirectUrl = isAffiliate
        ? `${window.location.origin}/dashboard?affiliate=new`
        : `${window.location.origin}/welcome`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { is_affiliate: isAffiliate }
        },
      });

      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        setMessage({ type: 'error', text: 'Email already registered. Please login instead.' });
        setMode('login');
      } else {
        if (isAffiliate) {
          setMessage({ type: 'success', text: 'Affiliate account created! Check your email to verify.' });
        } else {
          setMessage({ type: 'success', text: 'Account created! Check your email to verify, then complete your purchase.' });
        }
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
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password reset link sent! Check your email inbox.' });
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
          redirectTo: `${window.location.origin}/welcome`,
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
        <title>{isAffiliate ? 'Become an Affiliate' : mode === 'register' ? 'Register' : 'Login'} - Market Warrior</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
      `}</style>

      <style jsx>{`
        .login-container {
          background: white;
          padding: 50px;
          border-radius: 25px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          max-width: 450px;
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
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 600;
        }
        input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1em;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        .btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          font-size: 1.1em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 15px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .btn-google {
          background: white;
          color: #1e293b;
          border: 2px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .btn-google:hover {
          background: #f8fafc;
          border-color: #667eea;
        }
        .divider {
          display: flex;
          align-items: center;
          margin: 25px 0;
          color: #94a3b8;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .divider span {
          padding: 0 15px;
          font-size: 0.9em;
        }
        .links {
          margin-top: 25px;
          color: #64748b;
        }
        .links a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }
        .links a:hover {
          text-decoration: underline;
        }
        .message {
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
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
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .forgot-password {
          text-align: right;
          margin-bottom: 20px;
        }
        .forgot-password a {
          color: #667eea;
          text-decoration: none;
          font-size: 0.9em;
          cursor: pointer;
        }
        .forgot-password a:hover {
          text-decoration: underline;
        }
        .tab-buttons {
          display: flex;
          margin-bottom: 25px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }
        .tab-btn {
          flex: 1;
          padding: 12px;
          border: none;
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        @media (max-width: 480px) {
          .login-container {
            padding: 35px 25px;
          }
          h1 {
            font-size: 1.6em;
          }
        }
      `}</style>

      <div className="login-container">
        <img src="/logo.png" alt="Market Warrior" className="logo" onError={(e) => e.target.style.display = 'none'} />
        <h1>{isAffiliate ? 'Become an Affiliate' : 'Welcome Back!'}</h1>
        <p className="subtitle">
          {isAffiliate
            ? 'Sign up free to earn 25% commission on referrals'
            : 'Continue your trading journey'}
        </p>

        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        {mode !== 'reset' && (
          <div className="tab-buttons">
            <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
              Login
            </button>
            <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
              Register
            </button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="forgot-password">
              <a onClick={() => setMode('reset')}>Forgot password?</a>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
              {loading ? <><span className="spinner"></span>Logging in...</> : 'Login to Challenge'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Create Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
              {loading ? <><span className="spinner"></span>Creating account...</> : isAffiliate ? 'Create Affiliate Account' : 'Create Account'}
            </button>
            <p style={{ marginTop: '10px', color: '#64748b', fontSize: '0.9em' }}>
              By registering, you agree to our <Link href="/terms" style={{ color: '#667eea' }}>Terms</Link> and <Link href="/privacy" style={{ color: '#667eea' }}>Privacy Policy</Link>
            </p>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset}>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !ready}>
              {loading ? <><span className="spinner"></span>Sending...</> : 'Send Reset Link'}
            </button>
            <p className="links" style={{ marginTop: '20px' }}>
              <a onClick={() => setMode('login')} style={{ cursor: 'pointer' }}>← Back to Login</a>
            </p>
          </form>
        )}

        {mode !== 'reset' && (
          <>
            <div className="divider"><span>or continue with</span></div>
            <button className="btn btn-google" onClick={handleGoogle} disabled={!ready}>
              <svg width="20" height="20" viewBox="0 0 24 24">
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
          {!isAffiliate && <p>Don&apos;t have access? <Link href="/#pricing">Purchase Challenge - $39.99</Link></p>}
          <p style={{ marginTop: '10px' }}><Link href="/">← Back to Home</Link></p>
        </div>
      </div>
    </>
  );
}
