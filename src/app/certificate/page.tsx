import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CertificateDisplay from '@/components/CertificateDisplay';

export default async function CertificatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, has_paid')
    .eq('id', user.id)
    .single();

  if (!profile?.has_paid) {
    redirect('/pay');
  }

  // Check completion - all 30 days must have quiz_passed = true
  const { data: progress } = await supabase
    .from('user_progress')
    .select('day_number, quiz_passed')
    .eq('user_id', user.id)
    .eq('quiz_passed', true);

  const completedDays = progress?.length || 0;

  if (completedDays < 30) {
    redirect('/dashboard?error=complete_all_days');
  }

  // Get or create certificate
  let { data: certificate } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!certificate) {
    // Generate certificate number
    const certNumber = `MW-${Date.now().toString(36).toUpperCase()}-${user.id.slice(0, 4).toUpperCase()}`;
    
    const { data: newCert } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        certificate_number: certNumber
      })
      .select()
      .single();

    certificate = newCert;
  }

  const completionDate = new Date(certificate?.issued_at || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .certificate-print,
          .certificate-print * {
            visibility: visible;
          }
          .certificate-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: linear-gradient(to bottom right, #111827, #1f2937, #111827) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/dashboard" 
          className="text-gray-400 hover:text-white flex items-center gap-2 mb-8 print:hidden"
        >
          ← Back to Dashboard
        </Link>

        <CertificateDisplay
          fullName={profile?.full_name || 'Trading Graduate'}
          completionDate={completionDate}
          certificateNumber={certificate?.certificate_number || 'MW-XXXXXXXX'}
        />

        <div className="text-center mt-8 print:hidden">
          <Link 
            href="/dashboard" 
            className="text-gray-400 hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
