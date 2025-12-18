import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '../lib/supabase';
import { useState, useEffect } from 'react';

/**
 * Login page.
 *
 * This page renders the provided `login.html` template and wires up
 * Supabase authentication for email OTP/magic link and Google
 * sign‑in.  The static markup is loaded at build time; interactive
 * elements such as form submission and provider login are handled
 * via React hooks.  When the user submits their email the
 * Supabase client will send a magic link.  Clicking the Google
 * button initiates the OAuth flow.
 */
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'login.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return { props: { html } };
}

export default function LoginPage({ html }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Login failed');
      } else {
        // Redirect to next page based on gate status
        window.location.href = data.next || '/dashboard';
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Unable to connect. Please refresh the page.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setMessage(error.message);
  }
  // Replace placeholder forms in HTML with React forms after the
  // component has mounted.  For simplicity we insert our forms
  // outside the template markup below.
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="login-overlay" style={{ position: 'relative', padding: '20px' }}>
        <form onSubmit={handleEmailLogin} style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '8px', width: '70%', marginRight: '10px' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>
            Send Magic Link
          </button>
        </form>
        <button onClick={handleGoogle} style={{ padding: '8px 16px', background: '#4285F4', color: 'white' }}>
          Continue with Google
        </button>
        {message && <p style={{ marginTop: '10px', color: 'red' }}>{message}</p>}
      </div>
    </div>
  );
}