import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';

/**
 * Admin API: Toggle unlimited access for a user (bypass 120-day expiration)
 *
 * POST /api/admin/toggle-unlimited-access
 * Body: { email: "user@example.com", unlimited: true/false }
 *
 * Sets unlimited_access flag in user_profiles.
 * When true, user bypasses the 120-day access expiration rule.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY: Verify admin authorization (checks is_admin + email allowlist)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, unlimited } = req.body;
    if (!email || unlimited === undefined) {
      return res.status(400).json({ error: 'Email and unlimited flag are required' });
    }

    const supabase = getServiceSupabase();

    // Find the user by email in auth.users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users' });
    }

    const targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    // Update user_profiles with unlimited_access flag
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ unlimited_access: Boolean(unlimited) })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('Error updating unlimited access:', updateError);
      return res.status(500).json({ error: 'Failed to update access: ' + updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Unlimited access ${unlimited ? 'granted' : 'removed'} for ${email}`,
      userId: targetUser.id,
      unlimited_access: Boolean(unlimited)
    });

  } catch (err) {
    console.error('Toggle unlimited access error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
