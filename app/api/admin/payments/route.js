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

// GET - List all payments with filters
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return errorResponse(auth.error, auth.status);
    
    const { supabase } = auth;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'completed', 'refunded', etc.
    const search = searchParams.get('search'); // email search
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        user_profiles (
          email,
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }
    
    const { data: payments, count, error } = await query;
    
    if (error) throw error;
    
    // Get summary stats
    const { data: stats } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('status', 'completed');
    
    const totalRevenue = stats?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    const totalPayments = stats?.length || 0;
    
    // Get today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());
    
    const todayRevenue = todayPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    
    // Get this month's revenue
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const { data: monthPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', firstOfMonth.toISOString());
    
    const monthRevenue = monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
    
    return jsonResponse({
      payments,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      },
      stats: {
        total_revenue: totalRevenue.toFixed(2),
        total_payments: totalPayments,
        today_revenue: todayRevenue.toFixed(2),
        month_revenue: monthRevenue.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Admin payments GET error:', error);
    return errorResponse('Failed to fetch payments', 500);
  }
}

// POST - Process refund or update payment status
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return errorResponse(auth.error, auth.status);
    
    const { supabase } = auth;
    const body = await request.json();
    const { action, payment_id, reason } = body;
    
    if (action === 'mark_refunded') {
      // Mark a payment as refunded (actual Stripe refund done in Stripe dashboard)
      if (!payment_id) return errorResponse('payment_id required', 400);
      
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*, user_id')
        .eq('id', payment_id)
        .single();
      
      if (fetchError || !payment) return errorResponse('Payment not found', 404);
      
      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment_id);
      
      if (updateError) throw updateError;
      
      // Revoke user's access if they have one
      if (payment.user_id) {
        await supabase
          .from('user_profiles')
          .update({ 
            is_paid: false,
            access_expires_at: new Date().toISOString() // Expire immediately
          })
          .eq('id', payment.user_id);
      }
      
      // Log the action
      await supabase.from('activity_log').insert({
        user_id: auth.user.id,
        action: 'payment_refunded',
        details: { payment_id, reason, amount: payment.amount }
      });
      
      return jsonResponse({ 
        message: 'Payment marked as refunded and user access revoked',
        payment_id
      });
    }
    
    if (action === 'export') {
      // Export payments as CSV data
      const { start_date, end_date } = body;
      
      let query = supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      if (end_date) {
        query = query.lte('created_at', end_date);
      }
      
      const { data: exportPayments, error } = await query;
      
      if (error) throw error;
      
      return jsonResponse({ 
        payments: exportPayments,
        count: exportPayments.length
      });
    }
    
    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('Admin payments POST error:', error);
    return errorResponse('Failed to process payment action', 500);
  }
}
