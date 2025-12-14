import { jsonResponse, errorResponse } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code) return errorResponse('Missing promo code', 400);

    const supabase = getServiceClient();

    // Try to query promo_codes table - if it doesn't exist, return not found
    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        return jsonResponse({ valid: false, message: 'Invalid or expired promo code' });
      }

      // Check usage limits
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return jsonResponse({ valid: false, message: 'Promo code has reached maximum uses' });
      }

      // Check expiry
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return jsonResponse({ valid: false, message: 'Promo code has expired' });
      }

      return jsonResponse({
        valid: true,
        discount_percent: promo.discount_percent,
        discount_amount: promo.discount_amount,
        code: promo.code,
        message: `${promo.discount_percent}% discount applied!`
      });
    } catch (tableError) {
      // Table doesn't exist - promo codes feature not enabled
      console.log('Promo codes table not available');
      return jsonResponse({ valid: false, message: 'Promo codes not available' });
    }
  } catch (error) {
    console.error('Promo validation error:', error);
    return errorResponse('Failed to validate code', 500);
  }
}
