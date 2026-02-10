import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { generateCertificatePDF, formatCertificateDate } from '../../../lib/certificateGenerator';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query; // certificate_id like MW-1234

    const supabase = getServiceSupabase();

    // If id is provided, download that specific certificate (for admin or public download)
    // If not, download the current user's certificate
    let cert;

    if (id) {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_id', id)
        .maybeSingle();
      cert = data;
    } else {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      cert = data;
    }

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Generate PDF
    const formattedDate = formatCertificateDate(cert.completion_date);
    const pdfBuffer = await generateCertificatePDF(
      cert.full_name,
      cert.certificate_id,
      formattedDate
    );

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MarketWarrior-Certificate-${cert.certificate_id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    logger.error('Certificate download error:', err);
    return res.status(500).json({ error: 'Failed to generate certificate PDF' });
  }
}
