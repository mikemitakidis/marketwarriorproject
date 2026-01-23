import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * Admin API: Grant access to a user (bypass payment for testing)
 *
 * POST /api/admin/grant-access
 * Body: { email: "user@example.com" }
 *
 * This sets has_paid=true for testing purposes.
 * Only works if the requesting user's email is in ADMIN_EMAIL_ALLOWLIST.
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

    // Apply rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const supabase = getServiceSupabase();

    // Find the user by email in auth.users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      logger.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users' });
    }

    const targetUser = users.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found with that email' });
    }

    const now = new Date().toISOString();

    // Update or create user_profiles with has_paid = true
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: targetUser.id,
        has_paid: true,
        paid_at: now,
      }, { onConflict: 'id' });

    if (upsertError) {
      logger.error('Error granting access:', upsertError);
      return res.status(500).json({ error: 'Failed to grant access: ' + upsertError.message });
    }

    // Also create welcome onboarding entry so they can go straight to dashboard
    await supabase
      .from('user_onboarding')
      .upsert({
        user_id: targetUser.id,
        welcome_completed: true,
      }, { onConflict: 'user_id' });

    // Create initial progress for day 1
    await supabase
      .from('challenge_progress')
      .upsert({
        user_id: targetUser.id,
        day: 1,
        unlocked: true,
      }, { onConflict: 'user_id,day' });

    return res.status(200).json({
      success: true,
      message: `Access granted to ${email}`,
      userId: targetUser.id
    });

  } catch (err) {
    logger.error('Grant access error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
