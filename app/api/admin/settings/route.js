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
    
    const { data: settings } = await supabase
      .from('site_settings')
      .select('*');
    
    // Convert to key-value object
    const settingsObj = {};
    (settings || []).forEach(s => {
      settingsObj[s.key] = s.value;
    });
    
    return jsonResponse({ settings: settingsObj });
  } catch (error) {
    console.error('Admin settings error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const body = await request.json();
    const { key, value } = body;
    
    if (!key) {
      return errorResponse('Missing setting key', 400);
    }
    
    const supabase = createAdminSupabase();
    
    // Upsert setting
    await supabase
      .from('site_settings')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    await logActivity(user.id, 'admin_setting_update', { key, value });
    
    return jsonResponse({ success: true, key, value });
  } catch (error) {
    console.error('Admin setting update error:', error);
    return errorResponse('Failed to update setting', 500);
  }
}
