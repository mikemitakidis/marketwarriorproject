import { getUser, jsonResponse, errorResponse, isUserAdmin } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';
import { resetDevices } from '@/lib/fingerprint';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const supabase = getServiceClient();
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
    // profile_id is the PRIMARY KEY of user_profiles row
    const { user_id: profile_id, action, data } = body;
    
    if (!profile_id || !action) {
      return errorResponse('Missing user_id or action', 400);
    }
    
    const supabase = getServiceClient();
    
    // For actions that need the auth user_id, we need to look it up
    // because the frontend sends the profile's primary key (id), not user_id
    let authUserId = null;
    if (['reset_devices', 'reset_progress'].includes(action)) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('id', profile_id)
        .single();
      
      if (!profile) {
        return errorResponse('User not found', 404);
      }
      authUserId = profile.user_id;
    }
    
    switch (action) {
      case 'toggle_paid':
        await supabase
          .from('user_profiles')
          .update({ has_paid: data.has_paid, updated_at: new Date().toISOString() })
          .eq('id', profile_id);
        break;
        
      case 'toggle_admin':
        await supabase
          .from('user_profiles')
          .update({ is_admin: data.is_admin, updated_at: new Date().toISOString() })
          .eq('id', profile_id);
        break;
        
      case 'reset_devices':
        // Use authUserId (the user_id column value) for fingerprint reset
        await resetDevices(authUserId);
        break;
        
      case 'extend_access':
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + (data.days || 30));
        await supabase
          .from('user_profiles')
          .update({ access_expires_at: newExpiry.toISOString(), updated_at: new Date().toISOString() })
          .eq('id', profile_id);
        break;
        
      case 'reset_progress':
        // Use authUserId for progress tables that are keyed by user_id
        await supabase
          .from('challenge_progress')
          .delete()
          .eq('user_id', authUserId);
        await supabase
          .from('quiz_results')
          .delete()
          .eq('user_id', authUserId);
        await supabase
          .from('task_submissions')
          .delete()
          .eq('user_id', authUserId);
        // Reset progress in user_profiles too
        await supabase
          .from('user_profiles')
          .update({ 
            challenge_start_date: null, 
            current_day: 1,
            updated_at: new Date().toISOString() 
          })
          .eq('id', profile_id);
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
