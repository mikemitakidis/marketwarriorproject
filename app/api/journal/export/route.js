import { jsonResponse, errorResponse, getAuthUser, hasPaidAccess } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await hasPaidAccess(user.id)) return errorResponse('Payment required', 403);

    const supabase = getServiceClient();

    try {
      const { data: trades, error } = await supabase
        .from('trading_journal')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });

      if (error) throw error;

      // Return as JSON for now (client can convert to Excel)
      return jsonResponse({ trades: trades || [] });
    } catch (e) {
      // Table doesn't exist
      return jsonResponse({ 
        trades: [], 
        message: 'Trading journal not configured' 
      });
    }
  } catch (error) {
    console.error('Journal export error:', error);
    return errorResponse('Failed to export journal', 500);
  }
}
