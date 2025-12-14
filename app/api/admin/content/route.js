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
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');
    
    if (day) {
      // Get specific day with all content
      const { data, error } = await supabase
        .from('course_content')
        .select('*')
        .eq('day_number', parseInt(day))
        .single();
      
      if (error) throw error;
      return jsonResponse({ content: data });
    }
    
    // Get all days (summary)
    const { data, error } = await supabase
      .from('course_content')
      .select('day_number, title, has_video, youtube_video_id')
      .order('day_number', { ascending: true });
    
    if (error) throw error;
    return jsonResponse({ content: data });
  } catch (error) {
    console.error('Admin content error:', error);
    return errorResponse('Failed to fetch content', 500);
  }
}

export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);
    
    const body = await request.json();
    const { day_number, updates } = body;
    
    if (!day_number || !updates) {
      return errorResponse('Missing day_number or updates', 400);
    }
    
    const supabase = createAdminSupabase();
    
    // Only allow updating certain fields
    const allowedFields = ['title', 'content_html', 'youtube_video_id', 'has_video', 'task_instructions'];
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }
    
    if (Object.keys(safeUpdates).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }
    
    safeUpdates.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('course_content')
      .update(safeUpdates)
      .eq('day_number', day_number);
    
    if (error) throw error;
    
    await logActivity(user.id, 'content_updated', { day_number, fields: Object.keys(safeUpdates) });
    
    return jsonResponse({ success: true, day_number });
  } catch (error) {
    console.error('Admin content update error:', error);
    return errorResponse('Failed to update content', 500);
  }
}
