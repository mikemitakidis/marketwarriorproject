import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, isUserAdmin, logActivity } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

// GET - List all feed items (admin) or active items (public)
export async function GET(request) {
  try {
    const supabase = createAdminSupabase();
    const user = await getUser(request);
    const isAdmin = user ? await isUserAdmin(user.id) : false;

    let query = supabase
      .from('live_feed')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Non-admin only sees active items
    if (!isAdmin) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;

    return jsonResponse({ feed_items: data });
  } catch (error) {
    console.error('Live feed error:', error);
    return errorResponse('Failed to fetch feed', 500);
  }
}

// POST - Create new feed item (admin only)
export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);

    const body = await request.json();
    const { title, content, link_url, link_text, is_pinned } = body;

    if (!title || !content) {
      return errorResponse('Title and content are required', 400);
    }

    const supabase = createAdminSupabase();

    const { data, error } = await supabase
      .from('live_feed')
      .insert({
        title,
        content,
        link_url: link_url || null,
        link_text: link_text || null,
        is_pinned: is_pinned || false,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(user.id, 'live_feed_created', { title });

    return jsonResponse({ success: true, feed_item: data });
  } catch (error) {
    console.error('Create feed item error:', error);
    return errorResponse('Failed to create feed item', 500);
  }
}

// PATCH - Update feed item (admin only)
export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return errorResponse('Feed item ID required', 400);

    const supabase = createAdminSupabase();

    // Only allow certain fields to be updated
    const allowedUpdates = {};
    ['title', 'content', 'link_url', 'link_text', 'is_pinned', 'is_active'].forEach(field => {
      if (updates[field] !== undefined) allowedUpdates[field] = updates[field];
    });

    allowedUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('live_feed')
      .update(allowedUpdates)
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Update feed item error:', error);
    return errorResponse('Failed to update feed item', 500);
  }
}

// DELETE - Delete feed item (admin only)
export async function DELETE(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const admin = await isUserAdmin(user.id);
    if (!admin) return errorResponse('Admin access required', 403);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return errorResponse('Feed item ID required', 400);

    const supabase = createAdminSupabase();

    const { error } = await supabase
      .from('live_feed')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Delete feed item error:', error);
    return errorResponse('Failed to delete feed item', 500);
  }
}
