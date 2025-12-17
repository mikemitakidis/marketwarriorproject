'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getSiteUrl } from '@/lib/env';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const ref = searchParams.get('ref') || (typeof window !== 'undefined' ? localStorage.getItem('mw_ref') : null);
      if (ref) localStorage.setItem('mw_ref', ref);

      const redirectTo = `${getSiteUrl()}/auth/callback`;

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            referred_by_code: ref || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      router.push('/check-email');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithGoogle() {
    setError(null);
    setLoading(true);
    try {
      const redirectTo = `${getSiteUrl()}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err?.message ?? 'Google sign up failed.');
      setLoading(false);
    }
  }

  return (
    <form className="row" onSubmit={onSubmit}>
      <div className="row">
        <label>Full name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>

      <div className="row">
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="row">
        <label>Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>

      {error && <div style={{ color: 'salmon' }}>{error}</div>}

      <button className="btn btnPrimary" type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create account'}
      </button>

      <button className="btn" type="button" onClick={signUpWithGoogle} disabled={loading}>
        Continue with Google
      </button>

      <div style={{ opacity: .9 }}>
        Already have an account? <a href="/login">Login</a>
      </div>
    </form>
  );
}
