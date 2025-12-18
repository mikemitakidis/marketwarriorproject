import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    // Handles rare cases where Supabase returns tokens in the URL hash.
    const hash = window.location.hash || '';
    if (!hash) return;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const next = new URLSearchParams(window.location.search).get('next') || '/pay';
    if (!access_token || !refresh_token) return;

    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token, refresh_token, next })
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
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
  const { getAnonSupabase, setAuthCookies, getGateStatus, determineNextRoute } = require('../../lib/serverAuth');
  const { code, token_hash, type, next } = ctx.query || {};
  const supabase = getAnonSupabase();

  try {
    let session = null;
    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: String(token_hash), type: String(type) });
      if (error) throw error;
      session = data?.session || null;
    } else if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(String(code));
      if (error) throw error;
      session = data?.session || null;
    }

    if (session) {
      setAuthCookies(ctx.res, session);
      const gate = await getGateStatus(session.user.id);
      const dest = determineNextRoute(gate, next ? String(next) : undefined);
      return { redirect: { destination: dest, permanent: false } };
    }

    return { props: {} };
  } catch (e) {
    return { redirect: { destination: '/login?error=callback', permanent: false } };
  }
}
