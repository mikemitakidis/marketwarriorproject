import { jsonResponse, errorResponse, getAuthUser, isAdmin, logActivity } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const supabase = getServiceClient();
    const user = await getAuthUser(request);
    const userIsAdmin = user ? await isAdmin(user.id) : false;

    let query = supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Non-admin only sees active items
    if (!userIsAdmin) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.limit(50);
    
    if (error) {
      console.error('Announcements query error:', error);
      return jsonResponse({ feed_items: [] });
    }

    return jsonResponse({ feed_items: data || [] });
  } catch (error) {
    console.error('Live feed error:', error);
    return errorResponse('Failed to fetch feed', 500);
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
      case 'create': {
        const { title, content, type, is_pinned } = data;
        if (!title || !content) return errorResponse('Missing title or content', 400);

        const { error } = await supabase.from('announcements').insert({
          title,
          content,
          type: type || 'info',
          is_pinned: is_pinned || false,
          is_active: true,
          created_by: user.id
        });

        if (error) throw error;
        await logActivity(user.id, 'announcement_created', { title });
        return jsonResponse({ success: true });
      }

      case 'update': {
        const { id, ...updates } = data;
        if (!id) return errorResponse('Missing id', 400);

        const { error } = await supabase
          .from('announcements')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'delete': {
        const { id } = data;
        if (!id) return errorResponse('Missing id', 400);

        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'toggle_active': {
        const { id, is_active } = data;
        if (!id) return errorResponse('Missing id', 400);

        const { error } = await supabase
          .from('announcements')
          .update({ is_active, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      default:
        return errorResponse('Unknown action', 400);
    }
  } catch (error) {
    console.error('Live feed action error:', error);
    return errorResponse('Action failed', 500);
  }
}
