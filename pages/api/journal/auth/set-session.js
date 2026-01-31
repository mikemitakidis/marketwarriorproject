import { getAnonSupabase, getServiceSupabase, setJournalCookies, createJournalUser } from '../../../../lib/journalAuth';

/**
 * TRADING JOURNAL SET SESSION API
 * Creates/updates journal user and sets auth cookies.
 * Completely separate from course auth.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token, refresh_token } = req.body;

    if (!access_token || !refresh_token) {
      return res.status(400).json({ error: 'Missing tokens' });
    }

    // Verify the token with Supabase
    const supabase = getAnonSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(access_token);

    if (authError || !authData?.user) {
      console.error('Token verification failed:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = authData.user;

    // Create or get journal user (separate from course user_profiles)
    try {
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;
      await createJournalUser(user.id, user.email, fullName);
    } catch (err) {
      console.error('Error ensuring journal user:', err);
      // Don't fail - user might already exist
    }

    // Set Trading Journal cookies (separate from course cookies)
    setJournalCookies(res, { access_token, refresh_token });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Set session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
