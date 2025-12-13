import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, isUserAdmin, logActivity } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const supabase = createAdminSupabase();
    
    const { data: promos, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return jsonResponse({ promo_codes: promos });
  } catch (error) {
    console.error('Admin promo error:', error);
    return errorResponse('Failed to fetch promo codes', 500);
  }
}

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const body = await request.json();
    const { code, discount_percent, max_uses, expires_at } = body;
    
    if (!code || !discount_percent) {
      return errorResponse('Missing code or discount_percent', 400);
    }
    
    const supabase = createAdminSupabase();
    
    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: code.toUpperCase(),
        discount_percent,
        max_uses: max_uses || null,
        expires_at: expires_at || null,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return errorResponse('Promo code already exists', 400);
      }
      throw error;
    }
    
    await logActivity(user.id, 'promo_code_created', { code, discount_percent });
    
    return jsonResponse({ success: true, promo_code: data });
  } catch (error) {
    console.error('Admin promo create error:', error);
    return errorResponse('Failed to create promo code', 500);
  }
}

export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const body = await request.json();
    const { id, is_active } = body;
    
    if (!id) {
      return errorResponse('Missing promo code id', 400);
    }
    
    const supabase = createAdminSupabase();
    
    await supabase
      .from('promo_codes')
      .update({ is_active })
      .eq('id', id);
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Admin promo update error:', error);
    return errorResponse('Failed to update promo code', 500);
  }
}
