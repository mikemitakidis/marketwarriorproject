import { getServiceSupabase } from '../../../../lib/serverAuth';
import { generateCertificatePDF, formatCertificateDate } from '../../../../lib/certificateGenerator';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { id } = req.query;

  if (!id || !/^MW-\d{4}$/.test(id)) {
    return res.status(404).end();
  }

  const supabase = getServiceSupabase();

  const { data: cert } = await supabase
    .from('certificates')
    .select('certificate_id, full_name, completion_date')
    .eq('certificate_id', id)
    .maybeSingle();

  if (!cert) {
    return res.status(404).end();
  }

  // Generate the certificate PDF and return it as an image-friendly format
  // LinkedIn and social media crawlers will use the PDF download URL as OG image
  // We serve the PDF itself which LinkedIn can render as a preview
  const formattedDate = formatCertificateDate(cert.completion_date);
  const pdfBuffer = await generateCertificatePDF(
    cert.full_name,
    cert.certificate_id,
    formattedDate
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.send(pdfBuffer);
}
