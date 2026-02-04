/**
 * Journal Set Session API
 *
 * Sets journal-specific cookies (tj_at, tj_rt) and ensures user exists in journal_users table.
 * Completely separate from course auth.
 */

import { getAnonSupabase, setJournalAuthCookies, ensureJournalUser, checkJournalAccess } from '../../../../lib/journalAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, refresh_token } = req.body;

  if (!access_token || !refresh_token) {
    return res.status(400).json({ error: 'Missing tokens' });
  }

  try {
    // Verify the access token
    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.getUser(access_token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set journal cookies
    setJournalAuthCookies(res, { access_token, refresh_token });

    // Ensure user exists in journal_users table
    const journalUser = await ensureJournalUser(data.user);

    // Check journal access (paid mode gating)
    const access = await checkJournalAccess({
      hasPaid: journalUser.has_paid || false,
    });

    if (!access.hasAccess && access.requiresPayment) {
      return res.status(200).json({
        success: true,
        paymentRequired: true,
      });
    }

    return res.status(200).json({
      success: true,
      next: '/trading-journal',
    });

  } catch (err) {
    console.error('Journal set-session error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
