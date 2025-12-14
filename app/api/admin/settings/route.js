import { jsonResponse, errorResponse, getAuthUser, isAdmin } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

// Default settings when table doesn't exist
const DEFAULT_SETTINGS = {
  site_name: 'Market Warrior',
  support_email: 'support@marketwarrior.club',
  price_amount: 47,
  price_currency: 'USD',
  max_devices: 2,
  affiliate_rate_paid: 30,
  affiliate_rate_unpaid: 25
};

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const supabase = getServiceClient();

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error) throw error;
      return jsonResponse({ settings: data });
    } catch (e) {
      // Table doesn't exist - return defaults
      return jsonResponse({ 
        settings: DEFAULT_SETTINGS,
        message: 'Using default settings. Create site_settings table to customize.'
      });
    }
  } catch (error) {
    console.error('Admin settings error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const updates = await request.json();
    const supabase = getServiceClient();

    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (error) throw error;
      return jsonResponse({ success: true });
    } catch (e) {
      return errorResponse('Site settings table not configured. Create the table first.', 400);
    }
  } catch (error) {
    console.error('Admin settings update error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
