import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

export default function AffiliatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState(null);
  const [affiliateCode, setAffiliateCode] = useState('---');
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    pendingEarnings: 0,
    totalPaid: 0,
    referrals: []
  });

  const coursePrice = 39.99;
  const commissionRate = isPaidUser ? 30 : 25;
  const earningsPerReferral = (coursePrice * commissionRate / 100).toFixed(2);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      setSupabase(createClient(url, key));
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      checkAuth();
    }
  }, [supabase]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login?affiliate=true');
        return;
      }

      setUser(session.user);

      // Get user data
      const { data: userData } = await supabase
        .from('users')
        .select('has_paid, affiliate_code')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        setIsPaidUser(userData.has_paid || false);

        // Generate or use existing affiliate code
        if (userData.affiliate_code) {
          setAffiliateCode(userData.affiliate_code);
        } else {
          // Generate new code
          const email = session.user.email || '';
          const base = email.split('@')[0].toUpperCase().substring(0, 6);
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          const newCode = base + random;
          setAffiliateCode(newCode);

          // Save to database
          await supabase
            .from('users')
            .update({ affiliate_code: newCode })
            .eq('id', session.user.id);
        }
      }

      // Load affiliate stats
      await loadAffiliateStats(session.user.id);

    } catch (err) {
      console.error('Auth error:', err);
      router.push('/login?affiliate=true');
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliateStats = async (userId) => {
    try {
      // Try to get affiliate stats from database
      const { data: affiliateData } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('referrer_id', userId);

      if (affiliateData && affiliateData.length > 0) {
        const totalReferrals = affiliateData.length;
        const pendingEarnings = affiliateData
          .filter(r => r.status === 'pending')
          .reduce((sum, r) => sum + (r.commission_amount || 0), 0);
        const totalPaid = affiliateData
          .filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + (r.commission_amount || 0), 0);

        setStats({
          totalReferrals,
          pendingEarnings,
          totalPaid,
          referrals: affiliateData.map(r => ({
            date: new Date(r.created_at).toLocaleDateString(),
            name: r.referred_email ? r.referred_email.split('@')[0] + '***' : 'User',
            amount: r.commission_amount || earningsPerReferral,
            status: r.status || 'pending'
          }))
        });
      }
    } catch (err) {
      // Table might not exist yet, use default stats
      console.log('Affiliate stats not available:', err);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/?ref=${affiliateCode}`;
    navigator.clipboard.writeText(link);

    const btn = document.querySelector('.btn-copy');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 2000);
  };

  const requestPayout = () => {
    if (stats.pendingEarnings < 50) {
      alert('Minimum payout is $50. Keep referring to reach the threshold!');
      return;
    }
    alert('Payout request submitted! You will receive your payment within 7 business days.');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Refer & Earn - Market Warrior</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          min-height: 100vh;
          color: #f1f5f9;
        }
      `}</style>

      <style jsx>{`
        .header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          padding: 15px 30px;
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .logo img {
          width: 45px;
          height: 45px;
          border-radius: 10px;
        }

        .logo h1 {
          font-size: 1.4em;
          color: white;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 100px 20px 40px;
        }

        .hero-section {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
          border-radius: 24px;
          padding: 50px;
          margin-bottom: 30px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .hero-icon {
          font-size: 4em;
          margin-bottom: 20px;
        }

        .hero-section h2 {
          font-size: 2.5em;
          color: #1e293b;
          margin-bottom: 15px;
        }

        .hero-section p {
          font-size: 1.2em;
          color: rgba(30, 41, 59, 0.8);
          max-width: 600px;
          margin: 0 auto;
        }

        .commission-highlight {
          display: inline-block;
          background: #1e293b;
          color: #fbbf24;
          padding: 15px 40px;
          border-radius: 50px;
          font-size: 1.5em;
          font-weight: 700;
          margin-top: 25px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
        }

        .stat-icon {
          font-size: 2em;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 2.5em;
          font-weight: 700;
          color: #fbbf24;
        }

        .stat-label {
          color: #94a3b8;
          font-size: 0.9em;
          margin-top: 5px;
        }

        .link-section {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 35px;
          margin-bottom: 30px;
        }

        .link-section h3 {
          color: white;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .link-box {
          display: flex;
          gap: 12px;
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          padding: 8px;
          margin-bottom: 20px;
        }

        .link-box input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fbbf24;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 1em;
          padding: 15px;
          outline: none;
        }

        .btn-copy {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1e293b;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .btn-copy:hover {
          transform: scale(1.05);
        }

        .link-info {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
        }

        .link-info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 0.95em;
        }

        .link-info-item span {
          color: #fbbf24;
          font-weight: 600;
        }

        .how-it-works {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 35px;
          margin-bottom: 30px;
        }

        .how-it-works h3 {
          color: white;
          margin-bottom: 30px;
          text-align: center;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .step {
          text-align: center;
          padding: 20px;
        }

        .step-number {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5em;
          font-weight: 700;
          margin: 0 auto 20px;
        }

        .step h4 {
          color: white;
          margin-bottom: 10px;
        }

        .step p {
          color: #94a3b8;
          font-size: 0.95em;
          line-height: 1.6;
        }

        .referrals-section {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 35px;
          margin-bottom: 30px;
        }

        .referrals-section h3 {
          color: white;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .referrals-table {
          width: 100%;
          border-collapse: collapse;
        }

        .referrals-table th {
          text-align: left;
          padding: 15px;
          background: rgba(0,0,0,0.3);
          color: #94a3b8;
          font-size: 0.85em;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .referrals-table th:first-child {
          border-radius: 10px 0 0 10px;
        }

        .referrals-table th:last-child {
          border-radius: 0 10px 10px 0;
        }

        .referrals-table td {
          padding: 15px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .referrals-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }

        .status-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 600;
        }

        .status-badge.pending {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .status-badge.paid {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .empty-state {
          text-align: center;
          padding: 50px;
          color: #64748b;
        }

        .empty-state-icon {
          font-size: 3em;
          margin-bottom: 15px;
          opacity: 0.5;
        }

        .payout-section {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 35px;
        }

        .payout-section h3 {
          color: #10b981;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .payout-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .payout-card {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 20px;
        }

        .payout-card h4 {
          color: #94a3b8;
          font-size: 0.9em;
          margin-bottom: 8px;
        }

        .payout-card p {
          color: white;
          font-size: 1.1em;
        }

        .btn-request-payout {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 20px;
          transition: all 0.3s;
        }

        .btn-request-payout:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .btn-request-payout:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .back-link {
          display: inline-block;
          margin-top: 30px;
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .steps-grid {
            grid-template-columns: 1fr;
          }
          .payout-info {
            grid-template-columns: 1fr;
          }
          .hero-section {
            padding: 30px 20px;
          }
          .hero-section h2 {
            font-size: 1.8em;
          }
          .commission-highlight {
            font-size: 1.2em;
            padding: 12px 25px;
          }
        }

        @media (max-width: 600px) {
          .header {
            padding: 12px 15px;
          }
          .container {
            padding: 90px 15px 30px;
          }
          .link-box {
            flex-direction: column;
          }
          .link-box input {
            text-align: center;
          }
          .link-info {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <a href="/" className="logo">
          <img src="/logo.png" alt="Market Warrior" />
          <h1>Market Warrior</h1>
        </a>
      </header>

      <div className="container">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-icon">🤝</div>
            <h2>Refer & Earn</h2>
            <p>Share Market Warrior with your friends and earn commission on every successful referral!</p>
            <div className="commission-highlight">{commissionRate}% Commission</div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.totalReferrals}</div>
            <div className="stat-label">Total Referrals</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">${stats.pendingEarnings.toFixed(2)}</div>
            <div className="stat-label">Pending Earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">${stats.totalPaid.toFixed(2)}</div>
            <div className="stat-label">Total Paid</div>
          </div>
        </div>

        {/* Affiliate Link */}
        <div className="link-section">
          <h3>🔗 Your Unique Referral Link</h3>
          <div className="link-box">
            <input
              type="text"
              readOnly
              value={typeof window !== 'undefined' ? `${window.location.origin}/?ref=${affiliateCode}` : `https://marketwarrior.club/?ref=${affiliateCode}`}
            />
            <button className="btn-copy" onClick={copyLink}>📋 Copy Link</button>
          </div>
          <div className="link-info">
            <div className="link-info-item">
              💵 You earn: <span>${earningsPerReferral}</span> per referral
            </div>
            <div className="link-info-item">
              🎯 Course price: <span>$39.99</span>
            </div>
            <div className="link-info-item">
              📊 Your code: <span>{affiliateCode}</span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="how-it-works">
          <h3>📖 How It Works</h3>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Share Your Link</h4>
              <p>Copy your unique referral link and share it with friends, on social media, or your website.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>Friend Purchases</h4>
              <p>When someone uses your link to purchase the Market Warrior course, you earn commission.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Get Paid</h4>
              <p>Once your earnings reach $50, request a payout via PayPal or bank transfer.</p>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="referrals-section">
          <h3>📋 Your Referrals</h3>
          {stats.referrals.length > 0 ? (
            <table className="referrals-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Referral</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map((ref, idx) => (
                  <tr key={idx}>
                    <td>{ref.date}</td>
                    <td>{ref.name}</td>
                    <td>${typeof ref.amount === 'number' ? ref.amount.toFixed(2) : ref.amount}</td>
                    <td>
                      <span className={`status-badge ${ref.status}`}>
                        {ref.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No referrals yet. Share your link to start earning!</p>
            </div>
          )}
        </div>

        {/* Payout Section */}
        <div className="payout-section">
          <h3>💳 Payout Information</h3>
          <div className="payout-info">
            <div className="payout-card">
              <h4>Minimum Payout</h4>
              <p>$50.00</p>
            </div>
            <div className="payout-card">
              <h4>Payout Methods</h4>
              <p>PayPal, Bank Transfer</p>
            </div>
            <div className="payout-card">
              <h4>Payout Schedule</h4>
              <p>Within 7 business days</p>
            </div>
            <div className="payout-card">
              <h4>Available Balance</h4>
              <p>${stats.pendingEarnings.toFixed(2)}</p>
            </div>
          </div>
          <button
            className="btn-request-payout"
            disabled={stats.pendingEarnings < 50}
            onClick={requestPayout}
          >
            Request Payout
          </button>
          <p style={{ color: '#64748b', fontSize: '0.85em', marginTop: '15px' }}>
            * Payouts are processed once you reach the $50 minimum threshold.
          </p>
        </div>

        <a href="/dashboard" className="back-link">← Back to Dashboard</a>
      </div>
    </>
  );
}
