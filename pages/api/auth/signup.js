import { getAnonSupabase } from '../../../lib/serverAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });

    const supabase = getAnonSupabase();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/pay`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) return res.status(400).json({ error: error.message });

    // If email confirmation is ON, session will likely be null.
    return res.status(200).json({
      ok: true,
      needsEmailConfirmation: !data?.session,
      message: data?.session
        ? 'Account created.'
        : 'Account created. Check your inbox to confirm your email before logging in.'
    });
  } catch (e) {
    console.error('signup error:', e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
