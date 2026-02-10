import { getUserFromRequest, getServiceSupabase, verifyAdminAccess } from '../../../lib/serverAuth';
import { generateUniqueCertificateId } from '../../../lib/certificateGenerator';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = getServiceSupabase();

    // GET - list all certificates
    if (req.method === 'GET') {
      const { data: certs, error } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Admin certificates list error:', error);
        return res.status(500).json({ error: 'Failed to fetch certificates' });
      }

      return res.status(200).json({ certificates: certs || [] });
    }

    // POST - generate certificate for anyone (friends, family, etc.)
    if (req.method === 'POST') {
      const { fullName, completionDate, userId } = req.body;

      if (!fullName || !completionDate) {
        return res.status(400).json({ error: 'Full name and completion date are required' });
      }

      // Check if userId is provided and already has a certificate
      if (userId) {
        const { data: existing } = await supabase
          .from('certificates')
          .select('certificate_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          return res.status(400).json({
            error: `User already has certificate ${existing.certificate_id}`,
          });
        }
      }

      const certificateId = await generateUniqueCertificateId(supabase);

      const { data: cert, error: insertError } = await supabase
        .from('certificates')
        .insert({
          user_id: userId || null,
          certificate_id: certificateId,
          full_name: fullName,
          completion_date: completionDate,
          issued_by: user.email,
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Admin certificate insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create certificate' });
      }

      return res.status(200).json({ success: true, certificate: cert });
    }

    // DELETE - remove a certificate
    if (req.method === 'DELETE') {
      const { certificateId } = req.body;

      if (!certificateId) {
        return res.status(400).json({ error: 'Certificate ID required' });
      }

      const { error: deleteError } = await supabase
        .from('certificates')
        .delete()
        .eq('certificate_id', certificateId);

      if (deleteError) {
        logger.error('Admin certificate delete error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete certificate' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    logger.error('Admin certificates error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
