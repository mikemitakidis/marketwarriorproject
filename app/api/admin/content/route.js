import { jsonResponse, errorResponse, getAuthUser, isAdmin, logActivity } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');

    if (day) {
      // Get specific day content
      const { data, error } = await supabase
        .from('course_content')
        .select('*')
        .eq('day_number', parseInt(day))
        .single();

      if (error) throw error;
      
      // Also get quiz questions for this day
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('day_number', parseInt(day))
        .order('question_order', { ascending: true });

      return jsonResponse({ content: data, quiz_questions: questions || [] });
    }

    // Get all content overview
    const { data, error } = await supabase
      .from('course_content')
      .select('day_number, title, youtube_video_id')
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
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await isAdmin(user.id)) return errorResponse('Admin access required', 403);

    const { day_number, updates } = await request.json();
    if (!day_number || !updates) return errorResponse('Missing day_number or updates', 400);

    const supabase = getServiceClient();

    // Only allow updating columns that actually exist
    const allowedFields = ['title', 'subtitle', 'content_html', 'youtube_video_id', 'task_description', 'task_steps', 'next_preview'];
    const updateData = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('course_content')
      .update(updateData)
      .eq('day_number', day_number);

    if (error) throw error;

    await logActivity(user.id, 'content_updated', { day_number, fields: Object.keys(updateData) });

    return jsonResponse({ success: true, day_number });
  } catch (error) {
    console.error('Admin content update error:', error);
    return errorResponse('Failed to update content', 500);
  }
}
