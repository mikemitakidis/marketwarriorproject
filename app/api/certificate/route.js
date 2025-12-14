import { v4 as uuidv4 } from 'uuid';
import { jsonResponse, errorResponse, getAuthUser, hasPaidAccess, logActivity } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await hasPaidAccess(user.id)) return errorResponse('Payment required', 403);

    const supabase = getServiceClient();

    // Check if user has certificate data in their profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('certificate_id, certificate_issued_at, full_name')
      .eq('user_id', user.id)
      .single();

    if (profile?.certificate_id) {
      return jsonResponse({
        certificate: {
          certificate_id: profile.certificate_id,
          issued_to_name: profile.full_name || 'Market Warrior Graduate',
          issued_at: profile.certificate_issued_at
        }
      });
    }

    return jsonResponse({ certificate: null });
  } catch (error) {
    console.error('Certificate fetch error:', error);
    return errorResponse('Failed to fetch certificate', 500);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (!await hasPaidAccess(user.id)) return errorResponse('Payment required', 403);

    const supabase = getServiceClient();

    // Check completion status
    const { data: progress } = await supabase
      .from('challenge_progress')
      .select('day_number, quiz_passed, task_completed')
      .eq('user_id', user.id);

    const completedDays = (progress || []).filter(p => p.quiz_passed && p.task_completed).length;

    if (completedDays < 30) {
      return errorResponse(`You must complete all 30 days. Currently completed: ${completedDays}/30`, 400);
    }

    // Check if already has certificate
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('certificate_id, full_name')
      .eq('user_id', user.id)
      .single();

    if (profile?.certificate_id) {
      return jsonResponse({
        certificate: {
          certificate_id: profile.certificate_id,
          issued_to_name: profile.full_name || 'Market Warrior Graduate',
          issued_at: profile.certificate_issued_at
        },
        message: 'Certificate already exists'
      });
    }

    // Generate certificate ID
    const certificateId = `MW-${uuidv4().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    // Store certificate in user_profiles
    const { error } = await supabase
      .from('user_profiles')
      .update({
        certificate_id: certificateId,
        certificate_issued_at: now,
        course_completed: true,
        course_completed_at: now,
        updated_at: now
      })
      .eq('user_id', user.id);

    if (error) throw error;

    await logActivity(user.id, 'certificate_generated', { certificate_id: certificateId });

    return jsonResponse({
      success: true,
      certificate: {
        certificate_id: certificateId,
        issued_to_name: profile?.full_name || 'Market Warrior Graduate',
        issued_at: now
      },
      message: 'Certificate generated successfully!'
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return errorResponse('Failed to generate certificate', 500);
  }
}
