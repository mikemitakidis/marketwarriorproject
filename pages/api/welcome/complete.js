import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';

/**
 * API route: /api/welcome/complete
 *
 * Called when user completes the welcome/onboarding page.
 * Saves the user's full name to user_profiles and marks
 * welcome_completed in user_onboarding table.
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

    const { fullName, agreements } = req.body || {};
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const userEmail = user.email;

    // Update user_profiles with full name and terms acceptance
    // Use update instead of upsert to preserve existing has_paid value
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      // Profile exists, update it (preserves has_paid)
      // Note: only update full_name - no terms_accepted_at column in user_profiles!
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim(),
          full_name_locked: true, // Lock the name after setting
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return res.status(500).json({ error: 'Failed to save profile' });
      }
    } else {
      // No profile yet, create one
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          full_name: fullName.trim(),
          full_name_locked: true,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return res.status(500).json({ error: 'Failed to save profile' });
      }
    }

    // Mark welcome as completed in user_onboarding with agreements and email
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: user.id,
        email: userEmail,
        agree1: agreements?.agree1 || false,
        agree2: agreements?.agree2 || false,
        agree3: agreements?.agree3 || false,
        agree4: agreements?.agree4 || false,
        agree5: agreements?.agree5 || false,
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
}
