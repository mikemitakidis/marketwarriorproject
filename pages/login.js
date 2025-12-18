import fs from 'fs';
import path from 'path';
import { supabaseClient } from '../lib/supabase';
import { useState } from 'react';

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
  const [message, setMessage] = useState(null);
  async function handleEmailLogin(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if (error) setMessage(error.message);
    else setMessage('Check your email for the magic link!');
  }
  async function handleGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
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