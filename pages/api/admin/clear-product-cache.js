import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';

/**
 * Admin API: Clear cached Stripe product ID
 * Forces system to re-discover correct product by name
 */
export default async function handler(req, res) {
  try {
    // SECURITY: Verify admin authorization
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = getServiceSupabase();

    // Delete cached stripe_product_id from database
    const { error: deleteError } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', 'stripe_product_id');

    if (deleteError) {
      console.error('Error deleting stripe_product_id:', deleteError);
      return res.status(500).json({ error: 'Failed to clear cache' });
    }

    return res.status(200).json({
      success: true,
      message: 'Cached product ID cleared. Next price update will re-discover "Market Warrior 30-Day Trading Challenge"',
    });
  } catch (err) {
    console.error('Clear product cache error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
