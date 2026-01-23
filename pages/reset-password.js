import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '../lib/serverAuth';

export async function getServerSideProps({ req }) {
  // User must be logged in (session set by callback)
  const user = await getUserFromRequest(req);
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: { userEmail: user.email } };
}

export default function ResetPasswordPage({ userEmail }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      setSupabase(createClient(url, key));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;

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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated! Redirecting...' });
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - Market Warrior</title>
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
          background: linear-gradient(135deg, #667eea, #764ba2);
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
        .email-info {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          color: #64748b;
        }
      `}</style>

      <div className="container">
        <h1>Reset Password</h1>
        <p className="subtitle">Enter your new password</p>

        <div className="email-info">
          Resetting password for: <strong>{userEmail}</strong>
        </div>

        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn" disabled={loading || !supabase}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </>
  );
}
