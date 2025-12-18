import { getServiceSupabase, getUserFromRequest, getGateStatus } from '../../../lib/serverAuth';

/**
 * API endpoint for adding trading journal entries.
 *
 * POST: Creates a new journal entry for the authenticated paid user.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify user has paid
    const gate = await getGateStatus(user.id);
    if (!gate.hasPaid) {
      return res.status(403).json({ error: 'Payment required to use the trading journal' });
    }

    const { symbol, side, entry_price, exit_price, quantity, notes } = req.body;

    if (!symbol || !side) {
      return res.status(400).json({ error: 'Symbol and side are required' });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'Side must be "buy" or "sell"' });
    }

    const supabase = getServiceSupabase();

    const { data: entry, error } = await supabase
      .from('trading_journal_entries')
      .insert({
        user_id: user.id,
        symbol: symbol.trim().toUpperCase(),
        side,
        entry_price: entry_price || null,
        exit_price: exit_price || null,
        quantity: quantity || null,
        notes: notes || null,
        opened_at: new Date().toISOString(),
        closed_at: exit_price ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Journal entry error:', error);
      return res.status(500).json({ error: 'Failed to add journal entry' });
    }

    return res.status(201).json(entry);
  } catch (err) {
    console.error('Journal add error:', err);
    return res.status(500).json({ error: err.message });
  }
}
