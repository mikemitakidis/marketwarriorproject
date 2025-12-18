import bcrypt from 'bcryptjs';
import { getUserFromJwt, getUserProfile } from '../../../../lib/auth';
import { getServiceSupabase } from '../../../../lib/supabase';

/**
 * Admin API route: /api/admin/settings/stripe-price
 *
 * Allows an admin to update the active Stripe price ID used by the
 * checkout session.  The caller must provide a valid Supabase JWT
 * (Authorization header), be on the email allow‑list and supply the
 * correct admin password.  The new priceId must begin with
 * "price_".  On success the value is stored in the app_settings
 * table under key `stripe_price_id`.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Verify the caller's JWT
    const user = await getUserFromJwt(req);
    const supabase = getServiceSupabase();
    // Fetch the user profile to get the email
    const profile = await getUserProfile(user.id);
    const email = profile?.email || user.email;
    const allowListEnv = process.env.ADMIN_EMAIL_ALLOWLIST || '';
    const allowList = allowListEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!email || !allowList.includes(email.toLowerCase())) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    // Admin password gate: read from header or body
    const passwordFromHeader = req.headers['x-admin-password'] || req.headers['admin-password'];
    const passwordFromBody = req.body?.adminPassword;
    const providedPassword = passwordFromHeader || passwordFromBody;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!expectedHash) {
      return res.status(500).json({ error: 'Admin password not configured' });
    }
    if (!providedPassword || !(await bcrypt.compare(providedPassword, expectedHash))) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    // Parse payload
    const { priceId } = req.body || {};
    if (!priceId || typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      return res.status(400).json({ error: 'Invalid priceId' });
    }
    // Upsert into app_settings
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'stripe_price_id', value: priceId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      console.error('Failed to update app settings', error);
      return res.status(500).json({ error: 'Could not update price' });
    }
    return res.status(200).json({ success: true, priceId });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
}