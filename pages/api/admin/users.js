const { getServiceSupabase, getUserFromRequest } = require('../../../lib/serverAuth');

/**
 * API route: /api/admin/users
 *
 * Returns a list of users for the admin panel.
 * Only accessible to administrators (is_admin = true in user_profiles).
 */
module.exports = async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, email')
      .eq('id', user.id)
      .single();

    // Check email allow list
    const allowList = process.env.ADMIN_EMAIL_ALLOWLIST
      ? process.env.ADMIN_EMAIL_ALLOWLIST.split(',').map(e => e.trim().toLowerCase())
      : [];
    const emailAllowed = allowList.includes((user.email || '').toLowerCase());

    // Must be on allow list AND have is_admin flag
    if (!emailAllowed || !profile?.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, is_admin, has_paid, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch users');

    return res.status(200).json({ users: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
