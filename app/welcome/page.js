'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [agreements, setAgreements] = useState({
    agree1: false, agree2: false, agree3: false, agree4: false, agree5: false
  });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile?.has_paid) { router.push('/checkout'); return; }
    if (profile?.agreed_to_terms) { router.push('/dashboard'); return; }

    setUser(user);
    setProfile(profile);
    setFullName(profile?.full_name || '');
    
    // Generate affiliate code
    const code = user.email.split('@')[0].toUpperCase().substring(0, 6) + Math.random().toString(36).substring(2, 6).toUpperCase();
    setAffiliateCode(code);
    setLoading(false);
  }

  const allAgreed = fullName.trim().length > 0 && Object.values(agreements).every(v => v);

  async function handleStartChallenge() {
    if (!allAgreed) return;
    
    const confirmed = window.confirm(
      `Confirm your name: "${fullName}"\n\nThis will appear on your certificate and CANNOT be changed later.\n\nIs this correct?`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // P0.2 FIX: Use server API to set dates instead of client-side
      const res = await fetch('/api/challenge/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          affiliate_code: affiliateCode,
          agreements
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start challenge');
      }

      alert('🎉 Welcome to Market Warrior!\n\nDay 1 is now unlocked. Let\'s start your trading journey!');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  function copyAffiliateLink() {
    navigator.clipboard.writeText(`https://marketwarrior.club/?ref=${affiliateCode}`);
    alert('Copied!');
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)' }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '30px', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '50px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>⚔️</div>
          <h1 style={{ fontSize: '2.5em', marginBottom: '15px' }}>Welcome to Market Warrior!</h1>
          <p style={{ fontSize: '1.2em', opacity: 0.95 }}>Your 30-Day Trading Challenge Begins Now</p>
        </div>

        <div style={{ padding: '50px 40px' }}>
          {/* Welcome Message */}
          <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '30px', borderRadius: '20px', marginBottom: '40px', borderLeft: '5px solid #fbbf24' }}>
            <h2 style={{ color: '#92400e', marginBottom: '15px' }}>🎉 Congratulations on Your Purchase!</h2>
            <p style={{ color: '#78350f', lineHeight: 1.8 }}>
              You've taken the first step towards mastering the markets. Before we begin, please read through the challenge rules and terms below, then enter your name exactly as you want it to appear on your certificate.
            </p>
          </div>

          {/* Name Section */}
          <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '20px', marginBottom: '40px' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '20px' }}>✍️ Enter Your Full Name</h3>
            <p style={{ color: '#64748b', marginBottom: '15px' }}>This name will appear on your certificate of completion and cannot be changed later.</p>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              style={{ width: '100%', padding: '15px 20px', border: '2px solid #cbd5e1', borderRadius: '10px', fontSize: '1.1em' }}
            />
            <div style={{ background: '#fee2e2', border: '2px solid #ef4444', padding: '20px', borderRadius: '15px', marginTop: '20px' }}>
              <strong style={{ color: '#991b1b' }}>⚠️ Warning:</strong>
              <span style={{ color: '#991b1b' }}> Your name is PERMANENT and will be used on your certificate. Double-check spelling!</span>
            </div>
          </div>

          {/* Terms Section */}
          <div style={{ margin: '40px 0' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '25px', fontSize: '1.8em' }}>📋 Challenge Rules & Terms</h3>
            
            {[
              { title: '1. Access Period', content: 'You have 120 days from today to complete the challenge. After this period, your access will expire automatically.' },
              { title: '2. Refund Policy', content: '3-day money-back guarantee from purchase date. No refunds after Day 3 content is accessed.' },
              { title: '3. Device Limits', content: 'Account limited to 2 devices maximum. Sharing accounts is prohibited.' },
              { title: '4. Quiz Requirements', content: 'Must score 60% or higher on quizzes to unlock next day. Unlimited retakes allowed.' },
              { title: '5. Name Cannot Be Changed', content: 'The name you enter is permanent and will be used for your certificate of completion.' },
              { title: '6. Content Protection', content: 'All course materials are copyrighted. Do not share, copy, or distribute content.' },
              { title: '7. Challenge Structure', content: 'Day 1 unlocks immediately. Each subsequent day unlocks 24 hours after completing the previous day.' },
              { title: '8. Educational Disclaimer', content: 'This is educational only, not financial advice. Trading involves risk of loss.' },
              { title: '9. Community Guidelines', content: 'Be respectful. No spam, promotional content, or financial advice to others.' },
              { title: '10. Risk Disclosure', content: 'You can lose 100% of your investment. Only trade with money you can afford to lose.' },
            ].map((term, i) => (
              <div key={i} style={{ background: 'white', border: '2px solid #e2e8f0', padding: '25px', borderRadius: '15px', marginBottom: '20px' }}>
                <h4 style={{ color: '#667eea', marginBottom: '10px', fontSize: '1.2em' }}>{term.title}</h4>
                <p style={{ color: '#475569', lineHeight: 1.6 }}>{term.content}</p>
              </div>
            ))}
          </div>

          {/* Agreement Section */}
          <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '20px', margin: '40px 0' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '25px' }}>✅ I Agree To:</h3>
            
            {[
              { id: 'agree1', text: 'I have read and agree to all Terms & Conditions above' },
              { id: 'agree2', text: 'I understand this is education only, not financial advice, and I will use demo accounts' },
              { id: 'agree3', text: 'I understand my name is permanent and cannot be changed after submission' },
              { id: 'agree4', text: 'I understand I have 120 days of access and 3 days for refunds' },
              { id: 'agree5', text: 'I understand trading involves risk and I may lose money' },
            ].map((item) => (
              <div key={item.id} style={{ padding: '15px', margin: '15px 0', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '15px', border: '2px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={agreements[item.id]}
                  onChange={(e) => setAgreements({ ...agreements, [item.id]: e.target.checked })}
                  style={{ width: '24px', height: '24px', marginTop: '3px', cursor: 'pointer' }}
                />
                <label style={{ flex: 1, cursor: 'pointer', color: '#475569', lineHeight: 1.6 }}>{item.text}</label>
              </div>
            ))}
          </div>

          {/* Affiliate Section */}
          <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '30px', borderRadius: '20px', margin: '40px 0', textAlign: 'center' }}>
            <h3 style={{ color: '#92400e', marginBottom: '15px' }}>💰 Your Affiliate Link</h3>
            <p style={{ color: '#78350f', marginBottom: '15px' }}>Share your unique link and earn passive income!</p>
            
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '20px auto' }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold' }}>30%</div>
              <div style={{ fontSize: '0.8em' }}>Commission</div>
            </div>
            
            <p style={{ color: '#78350f', fontSize: '0.95em', marginBottom: '15px' }}>
              You get <strong>30% commission</strong> for every person who signs up through your link!
            </p>
            
            <div style={{ display: 'flex', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
              <input
                type="text"
                value={`https://marketwarrior.club/?ref=${affiliateCode}`}
                readOnly
                style={{ flex: 1, padding: '15px', border: '2px solid #fbbf24', borderRadius: '10px', background: 'white' }}
              />
              <button onClick={copyAffiliateLink} style={{ padding: '15px 25px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                Copy
              </button>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartChallenge}
            disabled={!allAgreed || submitting}
            style={{
              width: '100%',
              padding: '20px',
              background: (!allAgreed || submitting) ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              fontSize: '1.3em',
              fontWeight: 700,
              cursor: (!allAgreed || submitting) ? 'not-allowed' : 'pointer',
              boxShadow: allAgreed && !submitting ? '0 10px 40px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            {submitting ? '⏳ Starting...' : '🚀 Start My Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}
