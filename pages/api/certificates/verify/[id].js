import { getServiceSupabase } from '../../../../lib/serverAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || !/^MW-\d{4}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid certificate ID format' });
  }

  const supabase = getServiceSupabase();

  const { data: cert } = await supabase
    .from('certificates')
    .select('certificate_id, full_name, completion_date, issued_at')
    .eq('certificate_id', id)
    .maybeSingle();

  if (!cert) {
    return res.status(404).json({ error: 'Certificate not found', valid: false });
  }

  return res.status(200).json({
    valid: true,
    certificate: {
      id: cert.certificate_id,
      name: cert.full_name,
      completionDate: cert.completion_date,
      issuedAt: cert.issued_at,
    },
  });
}
