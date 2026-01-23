import { getServiceSupabase } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';

/**
 * Development-only API: Grant access to any user (bypass payment)
 *
 * POST /api/dev/grant-access
 * Body: { email: "user@example.com" }
 *
 * WARNING: This endpoint should be disabled or protected in production!
 * It allows bypassing payment for testing purposes.
 */
export default async function handler(req, res) {
  // SECURITY: Only allow in development mode - NEVER in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'This endpoint is disabled in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const supabase = getServiceSupabase();

    // Find the user by email in auth.users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      logger.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to list users: ' + listError.message });
    }

    const targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return res.status(404).json({
        error: `User not found with email: ${email}. Make sure the user has registered first.`
      });
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

    // Also mark welcome as completed so they go straight to dashboard
    const { error: onboardError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: targetUser.id,
        welcome_completed: true,
      }, { onConflict: 'user_id' });

    if (onboardError) {
      logger.warn('Warning: Could not update onboarding:', onboardError.message);
    }

    // Create initial progress for day 1
    const { error: progressError } = await supabase
      .from('challenge_progress')
      .upsert({
        user_id: targetUser.id,
        day: 1,
        unlocked: true,
      }, { onConflict: 'user_id,day' });

    if (progressError) {
      logger.warn('Warning: Could not create progress:', progressError.message);
    }

    logger.log(`[DEV] Access granted to ${email} (user: ${targetUser.id})`);

    return res.status(200).json({
      success: true,
      message: `Access granted to ${email}`,
      userId: targetUser.id,
      note: 'User can now login and access the dashboard'
    });

  } catch (err) {
    logger.error('Dev grant access error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
