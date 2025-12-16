import { getServiceSupabase } from '../../../lib/supabase';
import { getUserFromJwt, getUserProfile } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

/**
 * API route: /api/admin/users
 *
 * Returns a list of users for the admin panel.  This route should
 * only be accessible to administrators.  For simplicity this
 * implementation relies on a header `x-admin` to gate access.
 */
export default async function handler(req, res) {
  try {
    // Verify JWT and fetch user profile
    const user = await getUserFromJwt(req);
    const profile = await getUserProfile(user.id);
    // Check email allow list
    const allowList = process.env.ADMIN_EMAIL_ALLOWLIST ? process.env.ADMIN_EMAIL_ALLOWLIST.split(',') : [];
    const emailAllowed = allowList.includes(user.email);
    // Check is_admin flag
    const isAdminFlag = profile?.is_admin === true;
    // Check admin password gate
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const providedPassword = req.headers['x-admin-password'] || req.headers['admin-password'];
    let passwordOk = false;
    if (adminPasswordHash && providedPassword) {
      try {
        passwordOk = await bcrypt.compare(providedPassword, adminPasswordHash);
      } catch (e) {
        passwordOk = false;
      }
    }
    if (!emailAllowed || !isAdminFlag || !passwordOk) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, is_admin, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch users');
    return res.status(200).json({ users: data });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
}