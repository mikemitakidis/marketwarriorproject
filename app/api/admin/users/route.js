import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, isUserAdmin } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';
import { resetUserDevices } from '@/lib/fingerprint';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const supabase = createAdminSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    const { data, count, error } = await query;
    
    if (error) throw error;
    
    return jsonResponse({ users: data, total: count });
  } catch (error) {
    console.error('Admin users error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
}

export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const body = await request.json();
    const { user_id, action, data } = body;
    
    if (!user_id || !action) {
      return errorResponse('Missing user_id or action', 400);
    }
    
    const supabase = createAdminSupabase();
    
    switch (action) {
      case 'toggle_paid':
        await supabase
          .from('user_profiles')
          .update({ is_paid: data.is_paid })
          .eq('id', user_id);
        break;
        
      case 'toggle_admin':
        await supabase
          .from('user_profiles')
          .update({ is_admin: data.is_admin })
          .eq('id', user_id);
        break;
        
      case 'reset_devices':
        await resetUserDevices(user_id);
        break;
        
      case 'extend_access':
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + (data.days || 30));
        await supabase
          .from('user_profiles')
          .update({ access_expires_at: newExpiry.toISOString() })
          .eq('id', user_id);
        break;
        
      case 'reset_progress':
        await supabase
          .from('challenge_progress')
          .delete()
          .eq('user_id', user_id);
        await supabase
          .from('quiz_results')
          .delete()
          .eq('user_id', user_id);
        break;
        
      default:
        return errorResponse('Unknown action', 400);
    }
    
    return jsonResponse({ success: true, action });
  } catch (error) {
    console.error('Admin user action error:', error);
    return errorResponse('Action failed', 500);
  }
}
