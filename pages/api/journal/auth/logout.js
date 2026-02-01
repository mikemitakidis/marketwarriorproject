/**
 * Journal Logout API
 *
 * Clears journal-specific cookies (tj_at, tj_rt).
 * Does NOT affect course auth cookies.
 */

import { clearJournalAuthCookies } from '../../../../lib/journalAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear journal cookies
    clearJournalAuthCookies(res);

    return res.status(200).json({
      success: true,
      redirect: '/trading-journal/login',
    });

  } catch (err) {
    console.error('Journal logout error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
