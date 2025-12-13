import { NextResponse } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { code } = body;
    
    if (!code) {
      return errorResponse('Promo code required', 400);
    }
    
    const supabase = createAdminSupabase();
    
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('code, discount_percent, max_uses, current_uses, expires_at, is_active')
      .eq('code', code.toUpperCase())
      .single();
    
    if (error || !promo) {
      return jsonResponse({ valid: false, message: 'Invalid promo code' });
    }
    
    // Check if active
    if (!promo.is_active) {
      return jsonResponse({ valid: false, message: 'Promo code is no longer active' });
    }
    
    // Check if expired
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return jsonResponse({ valid: false, message: 'Promo code has expired' });
    }
    
    // Check usage limit
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      return jsonResponse({ valid: false, message: 'Promo code usage limit reached' });
    }
    
    return jsonResponse({
      valid: true,
      code: promo.code,
      discount_percent: promo.discount_percent,
      message: `${promo.discount_percent}% discount applied!`
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    return errorResponse('Failed to validate promo code', 500);
  }
}
