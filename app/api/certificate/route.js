import { NextResponse } from 'next/server';
import { getUser, jsonResponse, errorResponse, hasUserPaidAccess, logActivity } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const hasPaid = await hasUserPaidAccess(user.id);
    if (!hasPaid) return errorResponse('Payment required', 403);
    
    const supabase = createAdminSupabase();
    
    // Check if user has existing certificate
    const { data: existing } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (existing) {
      return jsonResponse({ certificate: existing });
    }
    
    return jsonResponse({ certificate: null });
  } catch (error) {
    console.error('Certificate fetch error:', error);
    return errorResponse('Failed to fetch certificate', 500);
  }
}

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    
    const hasPaid = await hasUserPaidAccess(user.id);
    if (!hasPaid) return errorResponse('Payment required', 403);
    
    const supabase = createAdminSupabase();
    
    // Verify all 30 days completed
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('day_number, quiz_passed, task_completed')
      .eq('user_id', user.id);
    
    const completedDays = (progress || []).filter(
      p => p.quiz_passed && p.task_completed
    ).length;
    
    if (completedDays < 30) {
      return errorResponse(`You must complete all 30 days. Currently completed: ${completedDays}/30`, 400);
    }
    
    // Check if certificate already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (existing) {
      return jsonResponse({ certificate: existing, message: 'Certificate already exists' });
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    
    // Generate certificate
    const certificateId = `MW-${uuidv4().slice(0, 8).toUpperCase()}`;
    
    const { data: cert, error } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        certificate_id: certificateId,
        issued_to_name: profile?.full_name || 'Market Warrior Graduate',
        issued_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    await logActivity(user.id, 'certificate_generated', { certificate_id: certificateId });
    
    return jsonResponse({
      success: true,
      certificate: cert,
      message: 'Certificate generated successfully!'
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return errorResponse('Failed to generate certificate', 500);
  }
}
