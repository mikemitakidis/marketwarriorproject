import React from 'react';
import { getUserFromRequest, getGateStatus, getServiceSupabase, getUserChallengeStatus } from '../lib/serverAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AnnouncementBanner from '../components/AnnouncementBanner';

export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id, user.email);

    // Gate logic: must be paid and welcome completed
    if (!gate.hasPaid) {
      return { redirect: { destination: '/pay', permanent: false } };
    }
    if (!gate.welcomeCompleted) {
      return { redirect: { destination: '/welcome', permanent: false } };
    }

    // Get user profile
    const supabase = getServiceSupabase();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email, paid_at')
      .eq('id', user.id)
      .single();

    // Get time-based unlock status
    const challengeStatus = await getUserChallengeStatus(user.id);
    const { unlockedDays, completedDays, welcomeCompletedAt } = challengeStatus;

    // Check if user has a certificate
    let certificate = null;
    if (completedDays.length === 30) {
      const { data: cert } = await supabase
        .from('certificates')
        .select('certificate_id, full_name, completion_date')
        .eq('user_id', user.id)
        .maybeSingle();
      certificate = cert || null;
    }

    // Get quiz attempts for average calculation
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('score, max_score')
      .eq('user_id', user.id);

    // Current day is the first unlocked but not completed, or day 1
    const currentDay = unlockedDays.find(d => !completedDays.includes(d)) || unlockedDays[unlockedDays.length - 1] || 1;
    const daysCompleted = completedDays.length;
    const overallProgress = Math.round((daysCompleted / 30) * 100);

    // Calculate average quiz score
    let avgQuizScore = 0;
    if (quizAttempts && quizAttempts.length > 0) {
      const totalPercentage = quizAttempts.reduce((sum, r) => {
        return sum + (r.max_score > 0 ? (r.score / r.max_score) * 100 : 0);
      }, 0);
      avgQuizScore = Math.round(totalPercentage / quizAttempts.length);
    }

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.full_name || 'Trader',
        },
        stats: {
          currentDay,
          daysCompleted,
          overallProgress,
          avgQuizScore,
        },
        unlockedDays,
        completedDays,
        welcomeCompletedAt: welcomeCompletedAt || null,
        certificate: certificate ? {
          id: certificate.certificate_id,
          name: certificate.full_name,
          date: certificate.completion_date,
        } : null,
      },
    };
  } catch (err) {
    console.error('Dashboard error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function Dashboard({ user, stats, unlockedDays, completedDays, welcomeCompletedAt, certificate }) {
  const router = useRouter();
  const [certLoading, setCertLoading] = React.useState(false);
  const [certData, setCertData] = React.useState(certificate);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleGenerateCertificate = async () => {
    setCertLoading(true);
    try {
      const res = await fetch('/api/certificates/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCertData({
          id: data.certificate.certificate_id,
          name: data.certificate.full_name,
          date: data.certificate.completion_date,
        });
      } else {
        alert(data.error || 'Failed to generate certificate');
      }
    } catch {
      alert('Failed to generate certificate');
    }
    setCertLoading(false);
  };

  const phases = [
    { name: 'Trading Foundations', days: [1, 2, 3, 4, 5, 6, 7], icon: '📚' },
    { name: 'Technical Analysis', days: [8, 9, 10, 11, 12, 13, 14], icon: '📊' },
    { name: 'Advanced Strategies', days: [15, 16, 17, 18, 19, 20, 21], icon: '🎯' },
    { name: 'Risk Management', days: [22, 23, 24, 25, 26, 27, 28], icon: '🛡️' },
    { name: 'Final Challenge', days: [29, 30], icon: '🏆' },
  ];

  // Calculate time until next day unlocks (24h from welcome_completed_at per day)
  const getNextUnlockTime = (currentUnlockedCount) => {
    if (currentUnlockedCount >= 30) return 'All days unlocked!';
    if (!welcomeCompletedAt) return 'Soon';
    const startTime = new Date(welcomeCompletedAt).getTime();
    const nextUnlockMs = startTime + currentUnlockedCount * 24 * 60 * 60 * 1000;
    const diff = nextUnlockMs - Date.now();
    if (diff <= 0) return 'Refreshing...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>Dashboard - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: white;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          color: #667eea;
        }
        .logo img { width: 40px; height: 40px; border-radius: 8px; }
        .user-section { display: flex; align-items: center; gap: 16px; }
        .user-name { color: #94a3b8; }
        .logout-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .welcome-banner {
          background: linear-gradient(135deg, #667eea, #764ba2);
          padding: 32px;
          border-radius: 16px;
          margin-bottom: 24px;
        }
        .welcome-banner h1 { font-size: 1.75rem; margin-bottom: 8px; }
        .welcome-banner p { opacity: 0.9; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #334155;
        }
        .stat-value { font-size: 2rem; font-weight: 700; color: #667eea; }
        .stat-label { color: #94a3b8; margin-top: 4px; }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .action-card {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #334155;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          color: white;
          display: block;
        }
        .action-card:hover { border-color: #667eea; transform: translateY(-2px); }
        .action-card.primary { background: linear-gradient(135deg, #667eea, #764ba2); border: none; }
        .action-icon { font-size: 2rem; margin-bottom: 12px; }
        .action-title { font-weight: 600; margin-bottom: 4px; }
        .action-desc { font-size: 0.875rem; color: #94a3b8; }
        .action-card.primary .action-desc { color: rgba(255,255,255,0.8); }
        .progress-section {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #334155;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .progress-bar { background: #334155; height: 8px; border-radius: 4px; margin-bottom: 24px; }
        .progress-fill {
          background: linear-gradient(90deg, #667eea, #764ba2);
          height: 100%;
          border-radius: 4px;
        }
        .phase { margin-bottom: 24px; }
        .phase-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #94a3b8;
        }
        .days-grid { display: flex; gap: 8px; flex-wrap: wrap; }
        .day-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #334155;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          cursor: not-allowed;
          font-size: 14px;
        }
        .day-btn.unlocked { border-color: #667eea; color: #667eea; cursor: pointer; }
        .day-btn.completed { background: #22c55e; border-color: #22c55e; color: white; }
        .day-btn.current { background: #667eea; border-color: #667eea; color: white; cursor: pointer; }
        .day-btn.locked { border-color: #334155; color: #475569; cursor: not-allowed; font-size: 12px; }
        .day-btn.locked:hover { background: transparent; }
        .unlock-info {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        .unlock-info-icon { font-size: 24px; }
        .unlock-info-text { display: flex; flex-direction: column; gap: 4px; }
        .unlock-info-text strong { color: #e2e8f0; font-size: 14px; }
        .unlock-timer {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #334155;
          color: #94a3b8;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: monospace;
          margin-top: 4px;
        }
        .cert-banner {
          background: linear-gradient(135deg, #0d1a3a, #162350);
          border: 2px solid #c9a84c;
          border-radius: 16px;
          padding: 28px 32px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .cert-banner-left { display: flex; align-items: center; gap: 16px; }
        .cert-banner-icon { font-size: 2.5rem; }
        .cert-banner-title { font-size: 1.25rem; font-weight: 700; color: #c9a84c; margin-bottom: 4px; }
        .cert-banner-desc { color: #94a3b8; font-size: 0.9rem; }
        .cert-banner-id { color: #c9a84c; font-weight: 600; font-size: 0.85rem; margin-top: 4px; }
        .cert-actions { display: flex; gap: 10px; flex-shrink: 0; }
        .cert-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          border: none;
          text-decoration: none;
          color: white;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .cert-btn-download { background: linear-gradient(135deg, #c9a84c, #e8d48b); color: #0d1a3a; }
        .cert-btn-share { background: #0077b5; }
        .cert-btn-generate { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .cert-btn:hover { opacity: 0.9; transform: translateY(-1px); transition: all 0.2s; }
        @media (max-width: 768px) {
          .stats-grid, .actions-grid { grid-template-columns: repeat(2, 1fr); }
          .cert-banner { flex-direction: column; text-align: center; }
          .cert-banner-left { flex-direction: column; }
          .cert-actions { flex-direction: column; width: 100%; }
          .cert-btn { justify-content: center; }
        }
      `}</style>

      <AnnouncementBanner type="student" />

      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="" onError={(e) => e.target.style.display = 'none'} />
          <span>Market Warrior</span>
        </div>
        <div className="user-section">
          <span className="user-name">{user.fullName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <div className="welcome-banner">
          <h1>Welcome back, {user.fullName}! 🔥</h1>
          <p>Your journey to becoming a confident trader continues.</p>
        </div>

        {/* Certificate section - shows when all 30 days completed */}
        {stats.daysCompleted === 30 && (
          <div className="cert-banner">
            <div className="cert-banner-left">
              <div className="cert-banner-icon">{certData ? '\uD83C\uDF93' : '\uD83C\uDFC6'}</div>
              <div>
                {certData ? (
                  <>
                    <div className="cert-banner-title">Your Certificate is Ready!</div>
                    <div className="cert-banner-desc">Congratulations on completing the 30-Day Trading Challenge!</div>
                    <div className="cert-banner-id">Certificate ID: {certData.id}</div>
                  </>
                ) : (
                  <>
                    <div className="cert-banner-title">Challenge Complete!</div>
                    <div className="cert-banner-desc">You completed all 30 days! Generate your Certificate of Completion.</div>
                  </>
                )}
              </div>
            </div>
            <div className="cert-actions">
              {certData ? (
                <>
                  <a href={`/api/certificates/download?id=${certData.id}`} className="cert-btn cert-btn-download">Download PDF</a>
                  <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent('30-Day Trading Challenge')}&organizationId=111592077&issueYear=${new Date(certData.date).getFullYear()}&issueMonth=${new Date(certData.date).getMonth() + 1}&certId=${certData.id}&certUrl=${encodeURIComponent(`https://www.marketwarrior.club/certificate/${certData.id}`)}`} target="_blank" rel="noopener noreferrer" className="cert-btn cert-btn-share">Add to LinkedIn</a>
                </>
              ) : (
                <button className="cert-btn cert-btn-generate" onClick={handleGenerateCertificate} disabled={certLoading}>
                  {certLoading ? 'Generating...' : 'Generate Certificate'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.currentDay}</div>
            <div className="stat-label">Current Day</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.daysCompleted}</div>
            <div className="stat-label">Days Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgQuizScore}%</div>
            <div className="stat-label">Avg Quiz Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.overallProgress}%</div>
            <div className="stat-label">Overall Progress</div>
          </div>
        </div>

        <div className="actions-grid">
          <a href={`/day/${stats.currentDay}`} className="action-card primary">
            <div className="action-icon">▶️</div>
            <div className="action-title">Continue Learning</div>
            <div className="action-desc">Day {stats.currentDay}</div>
          </a>
          <a href="/trading-journal/login" target="_blank" rel="noopener noreferrer" className="action-card">
            <div className="action-icon">📓</div>
            <div className="action-title">Trading Journal</div>
            <div className="action-desc">Track your trades</div>
          </a>
          <a href="/community" className="action-card">
            <div className="action-icon">💬</div>
            <div className="action-title">Community</div>
            <div className="action-desc">Connect with traders</div>
          </a>
          <a href="/students-affiliate" className="action-card">
            <div className="action-icon">🎁</div>
            <div className="action-title">Refer & Earn</div>
            <div className="action-desc">Get 30% commission</div>
          </a>
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <h2>📈 Your Challenge Progress</h2>
            <span>{stats.overallProgress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.overallProgress}%` }}></div>
          </div>

          {/* Info about unlock schedule */}
          <div className="unlock-info">
            <div className="unlock-info-icon">ℹ️</div>
            <div className="unlock-info-text">
              <strong>Daily unlocks: 24h cycle from sign-up.</strong>
              <span className="unlock-timer">Next unlock: {getNextUnlockTime(unlockedDays.length)}</span>
            </div>
          </div>

          {phases.map((phase, idx) => (
            <div className="phase" key={idx}>
              <div className="phase-header">
                <span>{phase.icon}</span>
                <span>{phase.name}</span>
                <span style={{ marginLeft: 8, fontSize: '0.75rem' }}>Days {phase.days[0]}-{phase.days[phase.days.length - 1]}</span>
              </div>
              <div className="days-grid">
                {phase.days.map(day => {
                  const isCompleted = completedDays.includes(day);
                  const isUnlocked = unlockedDays.includes(day);
                  const isCurrent = day === stats.currentDay;
                  const isLocked = !isUnlocked;

                  let className = 'day-btn';
                  if (isCompleted) className += ' completed';
                  else if (isCurrent) className += ' current';
                  else if (isUnlocked) className += ' unlocked';
                  else className += ' locked';

                  return (
                    <button
                      key={day}
                      className={className}
                      onClick={() => isUnlocked && router.push(`/day/${day}`)}
                      disabled={isLocked}
                      title={isLocked ? 'Locked - unlocks based on your sign-up date' : ''}
                    >
                      {isCompleted ? '✓' : isLocked ? '🔒' : day}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
