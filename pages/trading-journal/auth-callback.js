import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getAnonSupabase, setJournalAuthCookies, ensureJournalUser, checkJournalAccess } from '../../lib/journalAuth';

export default function JournalAuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
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

        // Check for error in URL
        const errorParam = queryParams.get('error') || hashParams.get('error');
        const errorDesc = queryParams.get('error_description') || hashParams.get('error_description');
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDesc);
          setError(errorDesc || errorParam);
          setTimeout(() => window.location.replace('/trading-journal/login?error=' + errorParam), 2000);
          return;
        }

        const type = hashParams.get('type') || queryParams.get('type');

        // Method 1: Check for tokens in hash
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          console.log('Found tokens in hash, setting journal session...');
          const res = await fetch('/api/journal/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token })
          });

          const data = await res.json().catch(() => ({}));

          if (type === 'recovery') {
            window.location.replace('/trading-journal/login?reset=true');
            return;
          }

          if (res.ok && data?.next) {
            window.location.replace(data.next);
          } else if (data?.paymentRequired) {
            window.location.replace('/trading-journal/upgrade');
          } else {
            window.location.replace('/trading-journal');
          }
          return;
        }

        // Method 2: Check for code in query
        const code = queryParams.get('code');
        if (code) {
          console.log('Found code in query, exchanging for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Code exchange error:', error);
            setError(error.message);
            setTimeout(() => window.location.replace('/trading-journal/login?error=exchange'), 2000);
            return;
          }

          if (data?.session) {
            const res = await fetch('/api/journal/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
              })
            });

            const responseData = await res.json().catch(() => ({}));

            if (type === 'recovery') {
              window.location.replace('/trading-journal/login?reset=true');
              return;
            }

            if (res.ok && responseData?.next) {
              window.location.replace(responseData.next);
            } else if (responseData?.paymentRequired) {
              window.location.replace('/trading-journal/upgrade');
            } else {
              window.location.replace('/trading-journal');
            }
            return;
          }
        }

        // Method 3: Try to get session from Supabase
        console.log('Checking for existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Found existing session, redirecting...');
          window.location.replace('/trading-journal');
          return;
        }

        // No auth data found
        console.log('No auth data found in callback URL');
        setError('No authentication data received. Please try again.');
        setTimeout(() => window.location.replace('/trading-journal/login'), 3000);

      } catch (err) {
        console.error('Callback processing error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => window.location.replace('/trading-journal/login?error=callback'), 3000);
      }
    };

    processCallback();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      padding: 24
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        maxWidth: 400
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 20 }}>📊</div>
        <h1 style={{ color: 'white', marginBottom: 12 }}>
          {error ? 'Authentication Error' : 'Signing you in...'}
        </h1>
        {error ? (
          <p style={{ color: '#f87171' }}>{error}</p>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>
            If this takes more than a few seconds, go back to{' '}
            <a href="/trading-journal/login" style={{ color: '#667eea' }}>Login</a>.
          </p>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const { code, token_hash, type } = ctx.query || {};

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
      // Set journal-specific cookies
      setJournalAuthCookies(ctx.res, session);

      // Ensure user exists in journal_users table
      const journalUser = await ensureJournalUser(session.user);

      // If password recovery, redirect to login with reset flag
      if (type === 'recovery') {
        return { redirect: { destination: '/trading-journal/login?reset=true', permanent: false } };
      }

      // Check journal access (paid mode gating)
      const access = await checkJournalAccess(journalUser);

      if (!access.hasAccess && access.requiresPayment) {
        return { redirect: { destination: '/trading-journal/upgrade', permanent: false } };
      }

      return { redirect: { destination: '/trading-journal', permanent: false } };
    }

    // No code or token_hash - render page for client-side handling
    return { props: {} };
  } catch (e) {
    console.error('Journal auth callback error:', e);
    return { redirect: { destination: '/trading-journal/login?error=callback', permanent: false } };
  }
}
