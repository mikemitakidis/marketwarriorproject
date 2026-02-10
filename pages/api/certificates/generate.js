import { getUserFromRequest, getServiceSupabase, getUserChallengeStatus } from '../../../lib/serverAuth';
import { generateUniqueCertificateId } from '../../../lib/certificateGenerator';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if user already has a certificate
    const { data: existing } = await supabase
      .from('certificates')
      .select('certificate_id, full_name, completion_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({
        success: true,
        certificate: existing,
        message: 'Certificate already exists',
      });
    }

    // Verify all 30 days are completed
    const challengeStatus = await getUserChallengeStatus(user.id);
    const { completedDays } = challengeStatus;

    if (completedDays.length < 30) {
      return res.status(400).json({
        error: `You must complete all 30 days first. Currently completed: ${completedDays.length}/30`,
      });
    }

    // Get user's name from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.full_name) {
      return res.status(400).json({ error: 'User name not found' });
    }

    // Get actual challenge completion date (Day 30 completed_at, or latest day)
    const { data: day30 } = await supabase
      .from('challenge_progress')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('day', 30)
      .eq('completed', true)
      .maybeSingle();

    let completionDateRaw;
    if (day30?.completed_at) {
      completionDateRaw = new Date(day30.completed_at);
    } else {
      // Fallback: latest completed day timestamp
      const { data: latest } = await supabase
        .from('challenge_progress')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      completionDateRaw = latest?.completed_at ? new Date(latest.completed_at) : new Date();
    }

    // Generate unique certificate ID
    const certificateId = await generateUniqueCertificateId(supabase);

    // Store in database with actual completion date
    const { data: cert, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        certificate_id: certificateId,
        full_name: profile.full_name,
        completion_date: completionDateRaw.toISOString().split('T')[0],
        issued_by: 'system',
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Certificate insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create certificate' });
    }

    return res.status(200).json({
      success: true,
      certificate: {
        certificate_id: certificateId,
        full_name: profile.full_name,
        completion_date: completionDateRaw.toISOString().split('T')[0],
      },
    });
  } catch (err) {
    logger.error('Certificate generate error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
