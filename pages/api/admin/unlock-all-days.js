import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/unlock-all-days
 *
 * Admin-only endpoint to unlock all 30 days for a specific user.
 * This overrides the time-based unlock system.
 *
 * POST body: { userId: string } or { email: string }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if current user is admin
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, email } = req.body;

    // Get target user ID
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: targetProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!targetProfile) {
        return res.status(404).json({ error: 'User not found with that email' });
      }
      targetUserId = targetProfile.id;
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'userId or email required' });
    }

    // Unlock all 30 days for the user
    // 1. Set welcome_completed_at to 30 days ago so time-based unlock shows all days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
      .from('user_onboarding')
      .update({
        welcome_completed: true,
        welcome_completed_at: thirtyDaysAgo.toISOString(),
      })
      .eq('user_id', targetUserId);

    // 2. Also create unlock records in challenge_progress for each day
    const unlockPromises = [];
    for (let day = 1; day <= 30; day++) {
      unlockPromises.push(
        supabase
          .from('challenge_progress')
          .upsert({
            user_id: targetUserId,
            day: day,
            unlocked: true,
          }, { onConflict: 'user_id,day' })
      );
    }

    await Promise.all(unlockPromises);

    // Get user info for response
    const { data: userInfo } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', targetUserId)
      .single();

    return res.status(200).json({
      success: true,
      message: `All 30 days unlocked for ${userInfo?.email || targetUserId}`,
      user: {
        id: targetUserId,
        email: userInfo?.email,
        fullName: userInfo?.full_name,
      },
    });

  } catch (err) {
    console.error('Admin unlock error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
