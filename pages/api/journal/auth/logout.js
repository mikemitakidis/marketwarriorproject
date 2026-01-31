import { clearJournalCookies } from '../../../../lib/journalAuth';

/**
 * TRADING JOURNAL LOGOUT API
 * Clears journal auth cookies only.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearJournalCookies(res);
  return res.status(200).json({ success: true });
}
