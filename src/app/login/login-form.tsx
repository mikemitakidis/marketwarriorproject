'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getSiteUrl } from '@/lib/env';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
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
      setError(err?.message ?? 'Google login failed.');
      setLoading(false);
    }
  }

  // Keep referral code if user landed with it
  const ref = searchParams.get('ref');
  if (typeof window !== 'undefined' && ref) localStorage.setItem('mw_ref', ref);

  return (
    <form className="row" onSubmit={onSubmit}>
      <div className="row">
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="row">
        <label>Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      {error && <div style={{ color: 'salmon' }}>{error}</div>}

      <button className="btn btnPrimary" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Login'}
      </button>

      <button className="btn" type="button" onClick={loginWithGoogle} disabled={loading}>
        Continue with Google
      </button>

      <div style={{ opacity: .9 }}>
        Don&apos;t have an account? <a href="/register">Register</a>
      </div>
    </form>
  );
}
