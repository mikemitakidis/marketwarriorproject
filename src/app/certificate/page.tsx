'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CertificatePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!data) {
      router.push('/dashboard')
      return
    }

    setUser(data)
    setEligible((data.completed_days || []).length >= 30)
    setLoading(false)
  }

  const downloadCertificate = () => {
    window.print()
  }

  const completionDate = user?.completed_days?.length >= 30 
    ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
  }

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          background: #f8fafc;
          min-height: 100vh;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .back-btn {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-family: -apple-system, sans-serif;
          font-weight: 600;
          margin-bottom: 30px;
        }
        .back-btn:hover { background: #5568d3; }
        .certificate {
          background: white;
          border: 8px solid #667eea;
          border-radius: 20px;
          padding: 60px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          position: relative;
        }
        .certificate::before {
          content: '';
          position: absolute;
          top: 20px; left: 20px; right: 20px; bottom: 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          pointer-events: none;
        }
        .logo { font-size: 60px; margin-bottom: 20px; }
        .title {
          font-size: 3em;
          color: #1e293b;
          margin-bottom: 10px;
          font-weight: 400;
          letter-spacing: 3px;
        }
        .subtitle {
          font-size: 1.2em;
          color: #64748b;
          margin-bottom: 40px;
          letter-spacing: 2px;
        }
        .presented {
          font-size: 1.1em;
          color: #64748b;
          margin-bottom: 10px;
        }
        .name {
          font-size: 2.5em;
          color: #667eea;
          margin-bottom: 30px;
          font-style: italic;
          border-bottom: 2px solid #667eea;
          display: inline-block;
          padding: 0 40px 10px;
        }
        .description {
          font-size: 1.1em;
          color: #475569;
          max-width: 600px;
          margin: 0 auto 40px;
          line-height: 1.8;
        }
        .date {
          font-size: 1em;
          color: #64748b;
          margin-bottom: 30px;
        }
        .signature-section {
          display: flex;
          justify-content: center;
          gap: 100px;
          margin-top: 40px;
        }
        .signature {
          text-align: center;
        }
        .signature-line {
          width: 200px;
          border-top: 2px solid #1e293b;
          margin-bottom: 10px;
        }
        .signature-name {
          font-size: 1em;
          color: #1e293b;
        }
        .signature-title {
          font-size: 0.9em;
          color: #64748b;
        }
        .cert-id {
          font-size: 0.8em;
          color: #94a3b8;
          margin-top: 30px;
          font-family: monospace;
        }
        .download-btn {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 15px 40px;
          border-radius: 10px;
          text-decoration: none;
          font-family: -apple-system, sans-serif;
          font-weight: 700;
          font-size: 1.1em;
          margin-top: 30px;
          cursor: pointer;
          border: none;
        }
        .download-btn:hover { transform: translateY(-2px); }
        .not-eligible {
          background: #fef2f2;
          border: 2px solid #ef4444;
          border-radius: 15px;
          padding: 40px;
          text-align: center;
        }
        .not-eligible h2 { color: #dc2626; margin-bottom: 15px; font-family: -apple-system, sans-serif; }
        .not-eligible p { color: #64748b; font-family: -apple-system, sans-serif; }
        @media print {
          .back-btn, .download-btn { display: none !important; }
          body { background: white; }
          .container { padding: 0; }
          .certificate { border: none; box-shadow: none; }
        }
      `}</style>

      <div className="container">
        <a href="/dashboard" className="back-btn">← Back to Dashboard</a>

        {eligible ? (
          <>
            <div className="certificate" ref={certificateRef}>
              <div className="logo">🏆</div>
              <h1 className="title">CERTIFICATE</h1>
              <p className="subtitle">OF COMPLETION</p>
              
              <p className="presented">This is to certify that</p>
              <p className="name">{user?.full_name || 'Trader'}</p>
              
              <p className="description">
                has successfully completed the <strong>Market Warrior 30-Day Trading Challenge</strong>, 
                demonstrating knowledge and understanding of trading fundamentals, technical analysis, 
                risk management, and trading psychology.
              </p>
              
              <p className="date">Awarded on {completionDate}</p>
              
              <div className="signature-section">
                <div className="signature">
                  <div className="signature-line"></div>
                  <p className="signature-name">Market Warrior</p>
                  <p className="signature-title">Course Director</p>
                </div>
              </div>
              
              <p className="cert-id">Certificate ID: MW-{user?.id?.slice(0, 8).toUpperCase() || 'XXXXXX'}</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button className="download-btn" onClick={downloadCertificate}>
                🖨️ Print / Download Certificate
              </button>
            </div>
          </>
        ) : (
          <div className="not-eligible">
            <h2>🔒 Certificate Not Yet Available</h2>
            <p>Complete all 30 days of the challenge to unlock your certificate.</p>
            <p style={{ marginTop: '10px' }}>
              Progress: {user?.completed_days?.length || 0} / 30 days completed
            </p>
          </div>
        )}
      </div>
    </>
  )
}
