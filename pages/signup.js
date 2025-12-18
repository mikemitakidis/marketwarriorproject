import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '../lib/supabase';
import { useState } from 'react';

/**
 * Signup page.
 *
 * Renders the `signup.html` template and wires up Supabase
 * registration.  Users can sign up via email/password or
 * through Google OAuth.  If the email already exists the user
 * account will be reused to avoid duplicate profiles.
 */
export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'templates', 'signup.html');
  const html = fs.readFileSync(filePath, 'utf8');
  return { props: { html } };
}

export default function SignupPage({ html }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailSignup(e) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Signup failed');
      } else {
        setMessage('Account created! Please check your email to confirm, then login.');
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
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <div className="signup-overlay" style={{ position: 'relative', padding: '20px' }}>
        <form onSubmit={handleEmailSignup} style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '8px', width: '70%', marginRight: '10px' }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>
            Register
          </button>
        </form>
        <button onClick={handleGoogle} style={{ padding: '8px 16px', background: '#4285F4', color: 'white' }}>
          Sign Up with Google
        </button>
        {message && <p style={{ marginTop: '10px', color: 'red' }}>{message}</p>}
      </div>
    </div>
  );
}