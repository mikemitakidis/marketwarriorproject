import Head from 'next/head';
import { getServiceSupabase } from '../../lib/serverAuth';
import { formatCertificateDate } from '../../lib/certificateGenerator';

export async function getServerSideProps({ params }) {
  const { id } = params;

  // Validate format
  if (!id || !/^MW-\d{4}$/.test(id)) {
    return { props: { certificate: null } };
  }

  const supabase = getServiceSupabase();

  const { data: cert } = await supabase
    .from('certificates')
    .select('certificate_id, full_name, completion_date, issued_at')
    .eq('certificate_id', id)
    .maybeSingle();

  if (!cert) {
    return { props: { certificate: null } };
  }

  return {
    props: {
      certificate: {
        id: cert.certificate_id,
        name: cert.full_name,
        completionDate: cert.completion_date,
        issuedAt: cert.issued_at,
        formattedDate: formatCertificateDate(cert.completion_date),
      },
    },
  };
}

export default function CertificateVerification({ certificate }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marketwarrior.club';

  if (!certificate) {
    return (
      <>
        <Head>
          <title>Certificate Not Found - Market Warrior</title>
        </Head>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; min-height: 100vh; }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#10060;</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '12px' }}>Certificate Not Found</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>This certificate ID is not valid or does not exist.</p>
          <a href="https://www.marketwarrior.club" style={{ color: '#667eea', textDecoration: 'none' }}>Go to Market Warrior</a>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{certificate.name} - Market Warrior Certificate</title>
        <meta name="description" content={`${certificate.name} has successfully completed the Market Warrior 30-Day Trading Challenge.`} />

        {/* Open Graph for LinkedIn sharing */}
        <meta property="og:title" content={`${certificate.name} - Market Warrior Certificate of Completion`} />
        <meta property="og:description" content={`${certificate.name} has successfully completed all 30 days of the Market Warrior Trading Challenge, demonstrating proficiency in trading fundamentals, technical analysis, and risk management.`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${baseUrl}/certificate/${certificate.id}`} />
        <meta property="og:image" content={`${baseUrl}/api/certificates/og-image/${certificate.id}`} />
        <meta property="og:image:width" content="1056" />
        <meta property="og:image:height" content="816" />
        <meta property="og:site_name" content="Market Warrior" />

        {/* Twitter/X card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${certificate.name} - Market Warrior Certificate`} />
        <meta name="twitter:description" content={`Completed the Market Warrior 30-Day Trading Challenge`} />
        <meta name="twitter:image" content={`${baseUrl}/api/certificates/og-image/${certificate.id}`} />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; min-height: 100vh; }
      `}</style>

      <style jsx>{`
        .container {
          max-width: 700px;
          margin: 0 auto;
          padding: 40px 24px;
          text-align: center;
        }
        .logo-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 40px;
        }
        .logo-section img {
          width: 48px;
          height: 48px;
          border-radius: 10px;
        }
        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
        }
        .valid-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
          padding: 10px 24px;
          border-radius: 30px;
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 32px;
        }
        .cert-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 40px;
          margin-bottom: 24px;
        }
        .cert-name {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #667eea, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cert-desc {
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .cert-details {
          display: flex;
          justify-content: center;
          gap: 40px;
          padding-top: 24px;
          border-top: 1px solid #334155;
        }
        .detail-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .detail-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
        }
        .phases {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-bottom: 24px;
        }
        .phase {
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 0.85rem;
          color: #a78bfa;
        }
        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s;
        }
        .download-btn:hover { transform: translateY(-2px); }
        .linkedin-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0077b5;
          color: white;
          border: none;
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s;
          margin-left: 12px;
        }
        .linkedin-btn:hover { transform: translateY(-2px); background: #005e93; }
        .btn-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .footer {
          color: #475569;
          font-size: 0.85rem;
          margin-top: 32px;
        }
        .footer a { color: #667eea; text-decoration: none; }
      `}</style>

      <div className="container">
        <div className="logo-section">
          <img src="/logo.png" alt="Market Warrior" />
          <span className="logo-text">Market Warrior</span>
        </div>

        <div className="valid-badge">&#9989; Verified Certificate</div>

        <div className="cert-card">
          <h1 className="cert-name">{certificate.name}</h1>
          <p className="cert-desc">
            Has successfully completed all phases of the Market Warrior 30-Day Trading Challenge,
            demonstrating proficiency in trading fundamentals, technical analysis, and risk management.
          </p>

          <div className="phases">
            <div className="phase">Trading Foundations</div>
            <div className="phase">Technical Analysis</div>
            <div className="phase">Advanced Strategies</div>
            <div className="phase">Risk Management</div>
            <div className="phase">Assessment</div>
          </div>

          <div className="cert-details">
            <div>
              <div className="detail-label">Certificate ID</div>
              <div className="detail-value">{certificate.id}</div>
            </div>
            <div>
              <div className="detail-label">Date Completed</div>
              <div className="detail-value">{certificate.formattedDate}</div>
            </div>
          </div>
        </div>

        <div className="btn-row">
          <a href={`/api/certificates/download?id=${certificate.id}`} className="download-btn">
            &#128196; Download PDF
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${baseUrl}/certificate/${certificate.id}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="linkedin-btn"
          >
            Share on LinkedIn
          </a>
        </div>

        <div className="footer">
          <p>Issued by <a href="https://www.marketwarrior.club">Market Warrior</a></p>
        </div>
      </div>
    </>
  );
}
