import { useEffect } from 'react';
import logger from '../lib/logger';
import { getAnonSupabase, setAuthCookies, getGateStatus, determineNextRoute } from '../../lib/serverAuth';

export default function AuthCallback() {
  useEffect(() => {
    // Handles cases where Supabase returns tokens in the URL hash.
    const hash = window.location.hash || '';
    if (!hash) return;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);

    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    // Check for recovery type in both hash and query string
    const type = hashParams.get('type') || queryParams.get('type');
    const next = queryParams.get('next') || '/pay';

    if (!access_token || !refresh_token) return;

    // First set the session
    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, refresh_token, next })
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));

      // If this is password recovery, go to reset password page
      if (type === 'recovery') {
        window.location.replace('/reset-password');
        return;
      }

      if (r.ok && j?.next) window.location.replace(j.next);
      else window.location.replace('/login');
    });
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1>Signing you in…</h1>
      <p>If this takes more than a few seconds, go back to <a href="/login">Login</a>.</p>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const { code, token_hash, type, next } = ctx.query || {};

  try {
    const supabase = getAnonSupabase();
    let session = null;

    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: String(token_hash),
        type: String(type)
      });
      if (error) throw error;
      session = data?.session || null;
    } else if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(String(code));
      if (error) throw error;
      session = data?.session || null;
    }

    if (session) {
      setAuthCookies(ctx.res, session);

      // If this is a password recovery, redirect to reset password page
      if (type === 'recovery') {
        return { redirect: { destination: '/reset-password', permanent: false } };
      }

      const gate = await getGateStatus(session.user.id, session.user.email);
      const dest = determineNextRoute(gate, next ? String(next) : undefined);
      return { redirect: { destination: dest, permanent: false } };
    }

    // No code or token_hash in URL - just render the page
    // The client-side useEffect will handle hash-based tokens
    return { props: {} };
  } catch (e) {
    logger.error('Auth callback error:', e);
    return { redirect: { destination: '/login?error=callback', permanent: false } };
  }
}
