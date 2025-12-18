const { getUserFromRequest, getServiceSupabase } = require('../../../lib/serverAuth');

/**
 * API route: /api/welcome/complete
 *
 * Called when user completes the welcome/onboarding page.
 * Saves the user's full name to user_profiles and marks
 * welcome_completed in user_onboarding table.
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

    const { fullName } = req.body || {};
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    // Update user_profiles with full name and terms acceptance
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        full_name: fullName.trim(),
        terms_accepted_at: now,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    // Mark welcome as completed in user_onboarding
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: user.id,
        welcome_completed: true,
        welcome_completed_at: now,
      }, { onConflict: 'user_id' });

    if (onboardingError) {
      console.error('Error updating onboarding:', onboardingError);
      return res.status(500).json({ error: 'Failed to save onboarding status' });
    }

    return res.status(200).json({ ok: true, next: '/dashboard' });
  } catch (err) {
    console.error('Welcome complete error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
