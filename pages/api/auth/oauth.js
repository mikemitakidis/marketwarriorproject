import { getAnonSupabase } from '../../../lib/serverAuth';

export default async function handler(req, res) {
  try {
    const provider = (req.query.provider || 'google').toString();
    const next = (req.query.next || '/pay').toString();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return res.status(500).send('Missing NEXT_PUBLIC_APP_URL');

    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    if (error || !data?.url) {
      return res.status(500).send(error?.message || 'OAuth init failed');
    }

    res.writeHead(302, { Location: data.url });
    res.end();
  } catch (e) {
    console.error('oauth error:', e);
    res.status(500).send(e.message || 'Server error');
  }
}
