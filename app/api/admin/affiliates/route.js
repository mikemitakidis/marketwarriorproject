import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

// Check if user is admin
async function requireAdmin(request) {
  const user = await getUser(request);
  if (!user) return { error: 'Unauthorized', status: 401 };
  
  const supabase = createAdminSupabase();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  
  if (!profile?.is_admin) return { error: 'Admin access required', status: 403 };
  
  return { user, supabase };
}

// GET - List all affiliates with their stats
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return errorResponse(auth.error, auth.status);
    
    const { supabase } = auth;
    
    // Get all affiliates with user info
    const { data: affiliates, error } = await supabase
      .from('affiliates')
      .select(`
        *,
        user_profiles (
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get referral counts for each affiliate
    const affiliatesWithStats = await Promise.all(affiliates.map(async (aff) => {
      const { count: pendingCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', aff.user_id)
        .eq('status', 'pending');
      
      const { count: convertedCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', aff.user_id)
        .eq('status', 'converted');
      
      return {
        ...aff,
        pending_referrals: pendingCount || 0,
        converted_referrals: convertedCount || 0
      };
    }));
    
    return jsonResponse({ affiliates: affiliatesWithStats });
  } catch (error) {
    console.error('Admin affiliates GET error:', error);
    return errorResponse('Failed to fetch affiliates', 500);
  }
}

// POST - Create affiliate or update affiliate settings
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return errorResponse(auth.error, auth.status);
    
    const { supabase } = auth;
    const body = await request.json();
    const { action, affiliate_id, user_id, commission_rate, is_active } = body;
    
    if (action === 'create') {
      // Create new affiliate for a user
      if (!user_id) return errorResponse('user_id required', 400);
      
      // Check if user exists
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', user_id)
        .single();
      
      if (!userProfile) return errorResponse('User not found', 404);
      
      // Generate affiliate code
      const code = userProfile.email.split('@')[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const { data: newAffiliate, error } = await supabase
        .from('affiliates')
        .insert({
          user_id,
          affiliate_code: code,
          commission_rate: commission_rate || 0.30,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return jsonResponse({ affiliate: newAffiliate, message: 'Affiliate created' });
    }
    
    if (action === 'update') {
      // Update affiliate settings
      if (!affiliate_id) return errorResponse('affiliate_id required', 400);
      
      const updateData = {};
      if (commission_rate !== undefined) updateData.commission_rate = commission_rate;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      const { data: updated, error } = await supabase
        .from('affiliates')
        .update(updateData)
        .eq('id', affiliate_id)
        .select()
        .single();
      
      if (error) throw error;
      
      return jsonResponse({ affiliate: updated, message: 'Affiliate updated' });
    }
    
    if (action === 'payout') {
      // Mark pending earnings as paid
      if (!affiliate_id) return errorResponse('affiliate_id required', 400);
      
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('pending_earnings')
        .eq('id', affiliate_id)
        .single();
      
      if (!affiliate) return errorResponse('Affiliate not found', 404);
      
      // Reset pending earnings (admin has paid them externally)
      const { error: updateError } = await supabase
        .from('affiliates')
        .update({ pending_earnings: 0 })
        .eq('id', affiliate_id);
      
      if (updateError) throw updateError;
      
      // Update referrals to paid status
      const { error: refError } = await supabase
        .from('referrals')
        .update({ status: 'paid' })
        .eq('referrer_user_id', (await supabase.from('affiliates').select('user_id').eq('id', affiliate_id).single()).data.user_id)
        .eq('status', 'converted');
      
      return jsonResponse({ 
        message: `Payout of $${affiliate.pending_earnings} marked as complete`,
        amount_paid: affiliate.pending_earnings
      });
    }
    
    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('Admin affiliates POST error:', error);
    return errorResponse('Failed to process affiliate action', 500);
  }
}
