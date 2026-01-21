import { getServiceSupabase, getUserFromRequest } , verifyAdminAccess } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/affiliates
 *
 * GET: List all affiliates with their stats
 * POST: Create a new affiliate
 * PUT: Update affiliate settings (commission rate, etc.)
 */
export default async function handler(req, res) {
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

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      // Get base commission from settings
      const { data: settings } = await supabase
        .from('affiliate_settings')
        .select('base_commission_percent')
        .single();

      const baseCommission = settings?.base_commission_percent || 25;

      // Get all users with affiliate_role = 'affiliate'
      const { data: affiliateUsers, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, affiliate_code, affiliate_role')
        .eq('affiliate_role', 'affiliate');

      if (error) {
        console.error('Error fetching affiliates:', error);
        return res.status(500).json({ error: error.message });
      }

      // Get referral stats for each affiliate
      const affiliates = [];

      for (const user of (affiliateUsers || [])) {
        // Get successful referrals
        const { data: referrals } = await supabase
          .from('affiliate_referrals')
          .select('commission_amount, status')
          .eq('affiliate_id', user.id);

        const successfulReferrals = (referrals || []).filter(r => r.status === 'completed');
        const pendingReferrals = (referrals || []).filter(r => r.status === 'pending');

        const totalRevenue = successfulReferrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0) / 100;
        const pendingPayout = pendingReferrals.reduce((sum, r) => sum + (r.commission_amount || 0), 0) / 100;

        affiliates.push({
          id: user.id,
          name: user.full_name || user.email?.split('@')[0] || 'Affiliate',
          email: user.email,
          affiliateCode: user.affiliate_code,
          commission: baseCommission,
          sales: successfulReferrals.length,
          revenue: Math.round(totalRevenue * 100) / 100,
          pendingPayout: Math.round(pendingPayout * 100) / 100,
        });
      }

      return res.status(200).json({
        affiliates,
        baseCommission,
      });
    }

    if (req.method === 'POST') {
      // Create new affiliate (upgrade user to affiliate)
      const { email, commissionRate } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find the user
      const { data: user, error: findError } = await supabase
        .from('user_profiles')
        .select('id, affiliate_code')
        .eq('email', email)
        .single();

      if (findError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate affiliate code if not exists
      const affiliateCode = user.affiliate_code || `MW${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Update user to affiliate role
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          affiliate_role: 'affiliate',
          affiliate_code: affiliateCode,
        })
        .eq('id', user.id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(201).json({
        success: true,
        affiliateCode,
      });
    }

    if (req.method === 'PUT') {
      // Update base commission rate
      const { baseCommission } = req.body;

      if (baseCommission === undefined) {
        return res.status(400).json({ error: 'Base commission is required' });
      }

      // Upsert affiliate settings
      const { error } = await supabase
        .from('affiliate_settings')
        .upsert({
          id: 1, // Singleton
          base_commission_percent: baseCommission,
        });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Affiliates API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
