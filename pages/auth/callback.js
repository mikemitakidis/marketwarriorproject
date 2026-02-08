import { useEffect, useState } from 'react';
import { getAnonSupabase, setAuthCookies, getGateStatus, determineNextRoute } from '../../lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setError('Configuration error');
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const queryParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash || '';
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));

        // Check for error in URL (Supabase returns errors this way sometimes)
        const errorParam = queryParams.get('error') || hashParams.get('error');
        const errorDesc = queryParams.get('error_description') || hashParams.get('error_description');
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDesc);
          setError(errorDesc || errorParam);
          setTimeout(() => window.location.replace('/login?error=' + errorParam), 2000);
          return;
        }

        const type = hashParams.get('type') || queryParams.get('type');
        const next = queryParams.get('next') || '/pay';

        // Method 1: Check for tokens in hash (implicit/PKCE flow)
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          const res = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token, next })
          });

          const data = await res.json().catch(() => ({}));

          if (type === 'recovery') {
            window.location.replace('/reset-password');
            return;
          }

          if (res.ok && data?.next) {
            window.location.replace(data.next);
          } else {
            window.location.replace('/login');
          }
          return;
        }

        // Method 2: Check for code in query (authorization code flow)
        const code = queryParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Code exchange error:', error);
            setError(error.message);
            setTimeout(() => window.location.replace('/login?error=exchange'), 2000);
            return;
          }

          if (data?.session) {
            // Set server-side cookies
            const res = await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                next
              })
            });

            const responseData = await res.json().catch(() => ({}));

            if (type === 'recovery') {
              window.location.replace('/reset-password');
              return;
            }

            if (res.ok && responseData?.next) {
              window.location.replace(responseData.next);
            } else {
              window.location.replace('/dashboard');
            }
            return;
          }
        }

        // Method 3: Try to get session from Supabase (might already be set)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.replace(next || '/dashboard');
          return;
        }

        // No auth data found
        setError('No authentication data received. Please try again.');
        setTimeout(() => window.location.replace('/login'), 3000);

      } catch (err) {
        console.error('Callback processing error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => window.location.replace('/login?error=callback'), 3000);
      }
    };

    processCallback();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1>{error ? 'Authentication Error' : 'Signing you in...'}</h1>
      {error ? (
        <p style={{ color: '#dc2626' }}>{error}</p>
      ) : (
        <p>If this takes more than a few seconds, go back to <a href="/login">Login</a>.</p>
      )}
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
    console.error('Auth callback error:', e);
    return { redirect: { destination: '/login?error=callback', permanent: false } };
  }
}
