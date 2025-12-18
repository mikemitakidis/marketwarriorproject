const { getServiceSupabase, getUserFromRequest } = require('../../../../lib/serverAuth');

/**
 * Admin API route: /api/admin/settings/stripe-price
 *
 * Allows an admin to update the active Stripe price ID used by the
 * checkout session. Only accessible to admins.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    // Check email allow list
    const allowListEnv = process.env.ADMIN_EMAIL_ALLOWLIST || '';
    const allowList = allowListEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const emailAllowed = allowList.includes((user.email || '').toLowerCase());

    if (!emailAllowed || !profile?.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Parse payload
    const { priceId } = req.body || {};
    if (!priceId || typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      return res.status(400).json({ error: 'Invalid priceId' });
    }

    // Upsert into app_settings
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: 'stripe_price_id', value: priceId, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Failed to update app settings', error);
      return res.status(500).json({ error: 'Could not update price' });
    }

    return res.status(200).json({ success: true, priceId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
