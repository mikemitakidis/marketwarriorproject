import { jsonResponse, errorResponse, getAuthUser, isAdmin } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const supabase = getServiceClient();

    // Get user counts
    const { data: users } = await supabase.from('user_profiles').select('id');
    
    // Try to get journal leads count
    let leadsCount = 0;
    try {
      const { data: leads } = await supabase.from('journal_leads').select('id');
      leadsCount = leads?.length || 0;
    } catch (e) {
      // Table doesn't exist
    }

    return jsonResponse({
      stats: {
        total_users: users?.length || 0,
        journal_leads: leadsCount
      }
    });
  } catch (error) {
    console.error('Admin emails error:', error);
    return errorResponse('Failed to fetch email stats', 500);
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
      case 'get_recipients': {
        const { type } = data;
        let recipients = [];

        if (type === 'users' || type === 'all') {
          const { data: users } = await supabase
            .from('user_profiles')
            .select('email, full_name');
          recipients = [...recipients, ...(users || []).map(u => ({ 
            email: u.email, 
            name: u.full_name,
            type: 'user'
          }))];
        }

        if (type === 'leads' || type === 'all') {
          try {
            const { data: leads } = await supabase
              .from('journal_leads')
              .select('email, name');
            recipients = [...recipients, ...(leads || []).map(l => ({ 
              email: l.email, 
              name: l.name,
              type: 'lead'
            }))];
          } catch (e) {
            // Table doesn't exist
          }
        }

        return jsonResponse({ recipients });
      }

      default:
        return errorResponse('Unknown action', 400);
    }
  } catch (error) {
    console.error('Admin emails action error:', error);
    return errorResponse('Action failed', 500);
  }
}
