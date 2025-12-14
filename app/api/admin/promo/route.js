import { jsonResponse, errorResponse, getAuthUser, isAdmin } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const supabase = getServiceClient();

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return jsonResponse({ promo_codes: data || [] });
    } catch (e) {
      // Table doesn't exist
      return jsonResponse({ 
        promo_codes: [], 
        message: 'Promo codes table not configured. Run the SQL setup to enable this feature.' 
      });
    }
  } catch (error) {
    console.error('Admin promo error:', error);
    return errorResponse('Failed to fetch promo codes', 500);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const { action, ...data } = await request.json();
    const supabase = getServiceClient();

    try {
      switch (action) {
        case 'create': {
          const { code, discount_percent, discount_amount, max_uses, expires_at } = data;
          if (!code) return errorResponse('Missing code', 400);

          const { error } = await supabase.from('promo_codes').insert({
            code: code.toUpperCase(),
            discount_percent: discount_percent || null,
            discount_amount: discount_amount || null,
            max_uses: max_uses || null,
            expires_at: expires_at || null,
            active: true,
            uses_count: 0
          });

          if (error) throw error;
          return jsonResponse({ success: true });
        }

        case 'toggle': {
          const { id, active } = data;
          const { error } = await supabase
            .from('promo_codes')
            .update({ active })
            .eq('id', id);

          if (error) throw error;
          return jsonResponse({ success: true });
        }

        case 'delete': {
          const { id } = data;
          const { error } = await supabase
            .from('promo_codes')
            .delete()
            .eq('id', id);

          if (error) throw error;
          return jsonResponse({ success: true });
        }

        default:
          return errorResponse('Unknown action', 400);
      }
    } catch (e) {
      return errorResponse('Promo codes table not configured. Run the SQL setup to enable this feature.', 400);
    }
  } catch (error) {
    console.error('Admin promo action error:', error);
    return errorResponse('Action failed', 500);
  }
}
