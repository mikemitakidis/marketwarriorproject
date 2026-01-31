import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * TRADING JOURNAL AUTH CALLBACK
 * Handles email confirmation and OAuth callbacks.
 * Completely separate from course auth.
 */
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

        // Check for error
        const errorParam = queryParams.get('error') || hashParams.get('error');
        if (errorParam) {
          setError(errorParam);
          setTimeout(() => window.location.replace('/trading-journal/login?error=1'), 2000);
          return;
        }

        const type = hashParams.get('type') || queryParams.get('type');

        // Method 1: Tokens in hash
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          const res = await fetch('/api/journal/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, refresh_token }),
          });

          if (type === 'recovery') {
            window.location.replace('/trading-journal/reset-password');
            return;
          }

          if (res.ok) {
            window.location.replace('/trading-journal');
          } else {
            window.location.replace('/trading-journal/login?error=session');
          }
          return;
        }

        // Method 2: Code exchange
        const code = queryParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
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
                refresh_token: data.session.refresh_token,
              }),
            });

            if (type === 'recovery') {
              window.location.replace('/trading-journal/reset-password');
              return;
            }

            if (res.ok) {
              window.location.replace('/trading-journal');
            } else {
              window.location.replace('/trading-journal/login?error=session');
            }
            return;
          }
        }

        // No auth data
        setError('No authentication data received.');
        setTimeout(() => window.location.replace('/trading-journal/login'), 3000);

      } catch (err) {
        console.error('Callback error:', err);
        setError(err.message);
        setTimeout(() => window.location.replace('/trading-journal/login?error=callback'), 3000);
      }
    };

    processCallback();
  }, []);

  return (
    <div style={{
      padding: 40,
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(135deg, #0f172a, #1e1e2e)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 16 }}>{error ? 'Error' : 'Signing you in...'}</h1>
        {error ? (
          <p style={{ color: '#f87171' }}>{error}</p>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Please wait...</p>
        )}
      </div>
    </div>
  );
}
