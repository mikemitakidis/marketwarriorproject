import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [isAffiliateSignup, setIsAffiliateSignup] = useState(false);

  useEffect(() => {
    // Initialize Supabase client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      setSupabase(createClient(url, key));
    }

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true') {
      setActiveTab('register');
    }
    if (params.get('affiliate') === 'true') {
      setIsAffiliateSignup(true);
      setActiveTab('register');
    }
    if (params.get('reset') === 'true') {
      setSuccess('Password updated! You can now login with your new password.');
    }

    // Check if already logged in
    checkSession();
  }, []);

  const checkSession = async () => {
    if (!supabase) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true' || params.get('affiliate') === 'true') {
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('agreed_to_terms, full_name')
        .eq('id', session.user.id)
        .single();

      if (userData && userData.agreed_to_terms) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/welcome';
      }
    }
  };

  useEffect(() => {
    if (supabase) {
      checkSession();
    }
  }, [supabase]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase || !email || !password) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      if (!data.session) throw new Error('No session returned');

      // Set server-side cookies
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

      // Check if user has paid
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('has_paid, agreed_to_terms')
        .eq('id', data.user.id)
        .single();

      // If user hasn't paid, redirect to checkout
      if (userError || !userData || !userData.has_paid) {
        setSuccess('Redirecting to checkout...');
        const urlParams = new URLSearchParams(window.location.search);
        const promoCode = urlParams.get('promo') || '';
        const refCode = urlParams.get('ref') || '';

        try {
          const response = await fetch('/api/checkout/stripe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              promoCode: promoCode,
              referralCode: refCode
            })
          });
          const checkoutData = await response.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
          } else {
            setError('Failed to start checkout. Please try again.');
            setLoading(false);
          }
        } catch (err) {
          setError('Checkout error. Please try again.');
          setLoading(false);
        }
        return;
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        if (userData.agreed_to_terms) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/welcome';
        }
      }, 1000);

    } catch (err) {
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!supabase || !email || !password) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin + (isAffiliateSignup ? '/dashboard?affiliate=new' : '/welcome'),
          data: {
            is_affiliate: isAffiliateSignup
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('This email is already registered. Please login instead.');
        setActiveTab('login');
      } else {
        if (isAffiliateSignup) {
          setSuccess('Affiliate account created! Check your email to verify, then you can get your referral link from the dashboard.');
        } else {
          setSuccess('Account created! Check your email to verify your account.');
        }
      }

    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!supabase || !email) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/login?reset=true'
      });
      if (resetError) throw resetError;
      setSuccess('Password reset link sent! Check your email inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/welcome'
        }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const goToCheckout = async (userEmail) => {
    setSuccess('Redirecting to checkout...');
    const urlParams = new URLSearchParams(window.location.search);
    const promoCode = urlParams.get('promo') || '';
    const refCode = urlParams.get('ref') || '';

    try {
      const response = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          promoCode: promoCode,
          referralCode: refCode
        })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      setError('Checkout error. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Login - Market Warrior</title>
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
          cursor: pointer;
        }

        .links a:hover {
          text-decoration: underline;
        }

        .message {
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          display: none;
        }

        .message.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          display: block;
        }

        .message.success {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
          display: block;
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

        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
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
        <img src="/logo.png" alt="Market Warrior" className="logo" />
        <h1>{isAffiliateSignup ? 'Become an Affiliate' : 'Welcome Back!'}</h1>
        <p className="subtitle">
          {isAffiliateSignup
            ? 'Sign up free to earn 25% commission on referrals'
            : 'Continue your trading journey'}
        </p>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Tab Buttons */}
        {activeTab !== 'reset' && (
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Login
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
            >
              Register
            </button>
          </div>
        )}

        {/* Login Form */}
        <div className={`tab-content ${activeTab === 'login' ? 'active' : ''}`}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email Address</label>
              <input
                type="email"
                id="loginEmail"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                type="password"
                id="loginPassword"
                placeholder="Enter your password"
                required
                minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="forgot-password">
              <a onClick={() => switchTab('reset')}>Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner"></span> Logging in...</>
              ) : (
                'Login to Challenge'
              )}
            </button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <button className="btn btn-google" onClick={signInWithGoogle}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Register Form */}
        <div className={`tab-content ${activeTab === 'register' ? 'active' : ''}`}>
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="regEmail">Email Address</label>
              <input
                type="email"
                id="regEmail"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="regPassword">Create Password</label>
              <input
                type="password"
                id="regPassword"
                placeholder="Min 6 characters"
                required
                minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="regConfirmPassword">Confirm Password</label>
              <input
                type="password"
                id="regConfirmPassword"
                placeholder="Confirm password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner"></span> Creating account...</>
              ) : (
                isAffiliateSignup ? 'Create Affiliate Account' : 'Create Account'
              )}
            </button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <button className="btn btn-google" onClick={signInWithGoogle}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ marginTop: '20px', color: '#64748b', fontSize: '0.9em' }}>
            By registering, you agree to our <a href="/terms" style={{ color: '#667eea' }}>Terms</a> and <a href="/privacy" style={{ color: '#667eea' }}>Privacy Policy</a>
          </p>
        </div>

        {/* Password Reset Form */}
        <div className={`tab-content ${activeTab === 'reset' ? 'active' : ''}`}>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleReset}>
            <div className="form-group">
              <label htmlFor="resetEmail">Email Address</label>
              <input
                type="email"
                id="resetEmail"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner"></span> Sending...</>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <p className="links" style={{ marginTop: '20px' }}>
            <a onClick={() => switchTab('login')}>← Back to Login</a>
          </p>
        </div>

        <div className="links">
          {!isAffiliateSignup && (
            <p>Don't have access? <a href="/#pricing">Purchase Challenge - $39.99</a></p>
          )}
          <p style={{ marginTop: '10px' }}><a href="/">← Back to Home</a></p>
        </div>
      </div>
    </>
  );
}
