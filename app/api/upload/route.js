import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const hasPaid = await hasUserPaidAccess(user.id);
    if (!hasPaid) return errorResponse('Payment required', 403);
    
    const formData = await request.formData();
    const file = formData.get('file');
    const dayNumber = formData.get('day_number');
    
    if (!file) {
      return errorResponse('No file provided', 400);
    }
    
    if (!dayNumber) {
      return errorResponse('Day number required', 400);
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF', 400);
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('File too large. Maximum size: 5MB', 400);
    }
    
    const supabase = createAdminSupabase();
    
    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `tasks/${user.id}/day${dayNumber}_${Date.now()}.${ext}`;
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true
      });
    
    if (error) {
      console.error('Upload error:', error);
      return errorResponse('Upload failed', 500);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(filename);
    
    return jsonResponse({
      success: true,
      url: publicUrl,
      filename: filename
    });
  } catch (error) {
    console.error('File upload error:', error);
    return errorResponse('Upload failed', 500);
  }
}
