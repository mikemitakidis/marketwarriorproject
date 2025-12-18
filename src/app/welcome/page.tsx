'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const [fullName, setFullName] = useState('')
  const [affiliateLink, setAffiliateLink] = useState('')
  const [agreed, setAgreed] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    // Generate affiliate link
    const code = btoa(session.user.email || '').substring(0, 8).toUpperCase()
    setAffiliateLink(`${window.location.origin}/?ref=${code}`)
  }

  const allAgreed = fullName.trim().length > 0 && Object.values(agreed).every(v => v)

  const handleCheckbox = (num: number) => {
    setAgreed(prev => ({ ...prev, [num]: !prev[num as keyof typeof prev] }))
  }

  const copyAffiliateLink = () => {
    navigator.clipboard.writeText(affiliateLink)
    alert('Copied!')
  }

  const startChallenge = async () => {
    if (!fullName.trim()) {
      alert('⚠️ Please enter your full name first!')
      return
    }

    const confirm = window.confirm(
      `Confirm your name: "${fullName}"\n\nThis will appear on your certificate and CANNOT be changed later.\n\nIs this correct?`
    )

    if (confirm) {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('users').update({
          full_name: fullName,
          agreed_to_terms: true,
          terms_agreed_at: new Date().toISOString(),
          challenge_start_date: new Date().toISOString()
        }).eq('id', session.user.id)
      }
      alert('🎉 Welcome to Market Warrior!\n\nDay 1 is now unlocked. Let\'s start your trading journey!')
      router.push('/dashboard')
    }
  }

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 30px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 50px 40px;
          text-align: center;
        }
        .logo { font-size: 80px; margin-bottom: 20px; }
        h1 { font-size: 2.5em; margin-bottom: 15px; }
        .subtitle { font-size: 1.2em; opacity: 0.95; }
        .content { padding: 50px 40px; }
        .welcome-message {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
          border-left: 5px solid #fbbf24;
        }
        .welcome-message h2 { color: #92400e; margin-bottom: 15px; }
        .welcome-message p { color: #78350f; line-height: 1.8; }
        .name-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 40px;
        }
        .name-section h3 { color: #1e293b; margin-bottom: 20px; }
        .name-input { display: flex; gap: 15px; margin-top: 20px; }
        .name-input input {
          flex: 1;
          padding: 15px 20px;
          border: 2px solid #cbd5e1;
          border-radius: 10px;
          font-size: 1.1em;
        }
        .name-input input:focus { outline: none; border-color: #667eea; }
        .warning-box {
          background: #fee2e2;
          border: 2px solid #ef4444;
          padding: 20px;
          border-radius: 15px;
          margin-top: 20px;
        }
        .warning-box strong { color: #991b1b; }
        .terms-section { margin: 40px 0; }
        .terms-section h3 { color: #1e293b; margin-bottom: 25px; font-size: 1.8em; }
        .term-item {
          background: white;
          border: 2px solid #e2e8f0;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }
        .term-item h4 { color: #667eea; margin-bottom: 15px; font-size: 1.3em; }
        .term-item ul { list-style: none; padding-left: 0; }
        .term-item li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
          color: #475569;
          line-height: 1.6;
        }
        .term-item li:before {
          content: "•";
          position: absolute;
          left: 5px;
          color: #667eea;
          font-weight: 700;
        }
        .highlight {
          background: #fef3c7;
          padding: 3px 8px;
          border-radius: 5px;
          font-weight: 600;
          color: #92400e;
        }
        .agreement-section {
          background: #f8fafc;
          padding: 30px;
          border-radius: 20px;
          margin: 40px 0;
        }
        .agreement-section h3 { color: #1e293b; margin-bottom: 25px; }
        .checkbox-item {
          padding: 15px;
          margin: 15px 0;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: start;
          gap: 15px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
        }
        .checkbox-item:hover { border-color: #667eea; }
        .checkbox-item input[type="checkbox"] {
          width: 24px;
          height: 24px;
          margin-top: 3px;
          cursor: pointer;
        }
        .checkbox-item label {
          flex: 1;
          cursor: pointer;
          color: #475569;
          line-height: 1.6;
        }
        .affiliate-section {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 30px;
          border-radius: 20px;
          margin: 40px 0;
          text-align: center;
        }
        .affiliate-section h3 { color: #92400e; margin-bottom: 20px; }
        .commission-badge {
          display: inline-block;
          background: white;
          padding: 20px 40px;
          border-radius: 15px;
          margin: 20px 0;
        }
        .commission-rate { font-size: 3em; font-weight: 700; color: #92400e; }
        .commission-text { color: #78350f; font-weight: 600; }
        .affiliate-link {
          background: white;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .affiliate-link input {
          flex: 1;
          padding: 10px;
          border: 2px solid #fbbf24;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          background: #fef3c7;
        }
        .copy-button {
          padding: 10px 20px;
          background: #fbbf24;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        .copy-button:hover { background: #f59e0b; }
        .start-button {
          width: 100%;
          padding: 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 1.3em;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 30px;
        }
        .start-button:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .start-button:disabled { background: #cbd5e1; cursor: not-allowed; }
        @media (max-width: 768px) {
          .content { padding: 30px 20px; }
          h1 { font-size: 2em; }
          .name-input { flex-direction: column; }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <div className="logo">🎉</div>
          <h1>Welcome, Market Warrior!</h1>
          <p className="subtitle">Your trading journey starts here</p>
        </div>

        <div className="content">
          <div className="welcome-message">
            <h2>🏆 Congratulations on Your Purchase!</h2>
            <p>You&apos;ve just taken the first step towards becoming a confident, professional trader. Over the next 30 days, you&apos;ll learn everything you need to start trading successfully.</p>
            <p style={{ marginTop: '15px' }}><strong>What happens next:</strong> After accepting the terms below, Day 1 will unlock immediately. Each subsequent day unlocks automatically after 24 hours.</p>
          </div>

          <div className="name-section">
            <h3>📝 Enter Your Full Name</h3>
            <p>This name will appear on your Certificate of Completion at the end of the challenge.</p>
            <div className="name-input">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required />
            </div>
            <div className="warning-box">
              <strong>⚠️ IMPORTANT:</strong> Your name cannot be changed later. Make sure it&apos;s spelled correctly!
            </div>
          </div>

          <div className="terms-section">
            <h3>📋 Terms &amp; Conditions</h3>
            <p style={{ marginBottom: '20px', color: '#64748b' }}>Please read carefully before proceeding</p>

            <div className="term-item">
              <h4>1. Virtual Trading Recommendation</h4>
              <p>We <strong>strongly recommend</strong> using only <span className="highlight">demo/virtual accounts</span> during this challenge.</p>
              <ul>
                <li>All lessons are designed for demo account practice</li>
                <li>Never risk real money until you&apos;re ready</li>
                <li>We are not responsible for any trading losses</li>
                <li>This is education, not financial advice</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>2. 3-Day Refund Policy</h4>
              <p>You have <span className="highlight">3 days from purchase</span> to request a full refund.</p>
              <ul>
                <li>Refund requests must be made within 72 hours</li>
                <li>After 3 days, all sales are final</li>
                <li>Refunds processed within 5-7 business days</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>3. Device Limitations</h4>
              <p>Your account can be used on <span className="highlight">up to 2 devices</span>.</p>
              <ul>
                <li>Maximum 2 devices allowed per account</li>
                <li>Account sharing is prohibited</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>4. 120-Day Access Period</h4>
              <p>You have <span className="highlight">120 days (4 months)</span> of platform access.</p>
              <ul>
                <li>Access starts from payment date</li>
                <li>Certificate remains valid forever</li>
              </ul>
            </div>

            <div className="term-item">
              <h4>5. Name Cannot Be Changed</h4>
              <p>The name you enter is <span className="highlight">permanent</span>.</p>
              <ul>
                <li>Used for your certificate of completion</li>
                <li>Cannot be changed after submission</li>
              </ul>
            </div>
          </div>

          <div className="agreement-section">
            <h3>✅ I Agree To:</h3>
            {[
              'I have read and agree to all Terms & Conditions above',
              'I understand this is education only, not financial advice, and I will use demo accounts',
              'I understand my name is permanent and cannot be changed after submission',
              'I understand I have 120 days of access and 3 days for refunds',
              'I understand trading involves risk and I may lose money'
            ].map((text, i) => (
              <div className="checkbox-item" key={i}>
                <input type="checkbox" id={`agree${i+1}`} checked={agreed[(i+1) as keyof typeof agreed]} onChange={() => handleCheckbox(i+1)} />
                <label htmlFor={`agree${i+1}`}>{text}</label>
              </div>
            ))}
          </div>

          <div className="affiliate-section">
            <h3>💰 Your Affiliate Link</h3>
            <p style={{ color: '#78350f', marginBottom: '15px' }}>Share your unique link and earn passive income!</p>
            <div className="commission-badge">
              <div className="commission-rate">30%</div>
              <p className="commission-text">Commission Per Sale</p>
            </div>
            <div className="affiliate-link">
              <input type="text" value={affiliateLink} readOnly />
              <button className="copy-button" onClick={copyAffiliateLink}>Copy</button>
            </div>
          </div>

          <button className="start-button" disabled={!allAgreed || loading} onClick={startChallenge}>
            {loading ? 'Starting...' : '🚀 Start My Challenge'}
          </button>
        </div>
      </div>
    </>
  )
}
