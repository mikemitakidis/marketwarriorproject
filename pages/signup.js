import fs from 'fs';
import path from 'path';
import { supabaseClient } from '../lib/supabase';
import { useState } from 'react';

/**
 * Signup page.
 *
 * Renders the `signup.html` template and wires up Supabase
 * registration.  Users can sign up via email OTP/magic link or
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
  const [message, setMessage] = useState(null);
  async function handleEmailSignup(e) {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if (error) setMessage(error.message);
    else setMessage('Check your email for the signup link!');
  }
  async function handleGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
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