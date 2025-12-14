import { jsonResponse, errorResponse, getAuthUser, isAdmin, logActivity } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const supabase = getServiceClient();

    // Get users who have affiliate_code set (they're affiliates)
    const { data: affiliates, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, affiliate_code, total_referrals, total_earnings, has_paid, created_at')
      .not('affiliate_code', 'is', null)
      .order('total_earnings', { ascending: false });

    if (error) throw error;

    // Get referrals data
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    // Format response to match expected structure
    const formattedAffiliates = (affiliates || []).map(a => ({
      id: a.user_id,
      user_id: a.user_id,
      email: a.email,
      full_name: a.full_name,
      affiliate_code: a.affiliate_code,
      commission_rate: a.has_paid ? 0.30 : 0.25,
      total_referrals: a.total_referrals || 0,
      total_earnings: parseFloat(a.total_earnings) || 0,
      status: 'active',
      created_at: a.created_at
    }));

    return jsonResponse({ 
      affiliates: formattedAffiliates, 
      referrals: referrals || [] 
    });
  } catch (error) {
    console.error('Admin affiliates error:', error);
    return errorResponse('Failed to fetch affiliates', 500);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const { action, ...data } = await request.json();
    const supabase = getServiceClient();

    switch (action) {
      case 'generate_code': {
        // Generate affiliate code for a user
        const { user_id } = data;
        if (!user_id) return errorResponse('Missing user_id', 400);
        
        // Generate unique code
        const code = `MW${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const { error } = await supabase
          .from('user_profiles')
          .update({ affiliate_code: code })
          .eq('user_id', user_id);

        if (error) throw error;
        
        return jsonResponse({ success: true, affiliate_code: code });
      }

      case 'update_referral': {
        // Update referral status (paid/pending)
        const { referral_id, status } = data;
        if (!referral_id || !status) return errorResponse('Missing referral_id or status', 400);
        
        const { error } = await supabase
          .from('referrals')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', referral_id);

        if (error) throw error;
        
        return jsonResponse({ success: true });
      }

      case 'payout': {
        // Mark referrals as paid
        const { affiliate_id, referral_ids } = data;
        if (!affiliate_id) return errorResponse('Missing affiliate_id', 400);
        
        // Update referrals to paid status
        if (referral_ids && referral_ids.length > 0) {
          await supabase
            .from('referrals')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .in('id', referral_ids);
        }
        
        return jsonResponse({ success: true, message: 'Payout processed' });
      }

      default:
        return errorResponse('Unknown action', 400);
    }
  } catch (error) {
    console.error('Admin affiliate action error:', error);
    return errorResponse('Action failed', 500);
  }
}
