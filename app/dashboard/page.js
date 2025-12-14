'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const quotes = [
  '"The stock market is filled with individuals who know the price of everything, but the value of nothing." — Phillip Fisher',
  '"Risk comes from not knowing what you\'re doing." — Warren Buffett',
  '"In investing, what is comfortable is rarely profitable." — Robert Arnott',
  '"The goal of a successful trader is to make the best trades. Money is secondary." — Alexander Elder',
  '"Successful investing takes time, discipline and patience." — Warren Buffett',
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [quote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile?.has_paid) { router.push('/checkout'); return; }
    if (!profile?.agreed_to_terms) { router.push('/welcome'); return; }

    const { data: progressData } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('day_number');

    setUser(user);
    setProfile(profile);
    setProgress(progressData || []);
    setLoading(false);
  }

  // Calculate stats
  const completedDays = progress.filter(p => p.completed).length;
  const currentDay = Math.min(completedDays + 1, 30);
  const progressPercent = Math.round((completedDays / 30) * 100);
  const avgQuizScore = progress.length > 0 
    ? Math.round(progress.filter(p => p.quiz_score).reduce((a, b) => a + (b.quiz_score || 0), 0) / Math.max(progress.filter(p => p.quiz_score).length, 1))
    : 0;

  // Calculate days remaining
  const daysRemaining = profile?.access_expires_at 
    ? Math.max(0, Math.ceil((new Date(profile.access_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 120;

  // Determine if a day is unlocked
  function isDayUnlocked(dayNum) {
    if (dayNum === 1) return true;
    const prevDay = progress.find(p => p.day_number === dayNum - 1);
    if (!prevDay?.completed) return false;
    
    // Check 24 hour unlock
    const completedAt = new Date(prevDay.completed_at);
    const unlockTime = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);
    return new Date() >= unlockTime;
  }

  function getDayStatus(dayNum) {
    const dayProgress = progress.find(p => p.day_number === dayNum);
    if (dayProgress?.completed) return 'completed';
    if (isDayUnlocked(dayNum)) return 'current';
    return 'locked';
  }

  async function logout() {
    if (confirm('Are you sure you want to logout?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}><div className="spinner" /></div>;
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', color: '#f1f5f9' }}>
      {/* Header */}
      <header style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', padding: '15px 30px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>⚔️</span>
          <h1 style={{ fontSize: '1.4em', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Market Warrior</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: 'white' }}>{profile?.full_name}</div>
            <div style={{ fontSize: '0.8em', color: '#10b981' }}>Active Warrior</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <button onClick={logout} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 20px 40px' }}>
        {/* Welcome Section */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)', borderRadius: '24px', padding: '40px', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '30px' }}>
            <div>
              <h2 style={{ fontSize: '2.2em', marginBottom: '10px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                Welcome back, {profile?.full_name?.split(' ')[0]}! 👋
              </h2>
              <p style={{ fontSize: '1.1em', opacity: 0.95 }}>Day {currentDay} of 30 - Keep pushing forward!</p>
              <p style={{ marginTop: '15px', fontStyle: 'italic', opacity: 0.85, fontSize: '0.95em' }}>{quote}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '25px 35px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '0.9em', opacity: 0.9, marginBottom: '8px' }}>Next Day Unlocks In</div>
              <div style={{ fontSize: '2.2em', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>
                {completedDays >= 30 ? '🎉 Done!' : '24:00:00'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          {[
            { value: currentDay, label: 'Current Day', color: '#10b981', icon: '📍' },
            { value: `${completedDays}/30`, label: 'Days Completed', color: '#667eea', icon: '✅' },
            { value: `${avgQuizScore}%`, label: 'Avg Quiz Score', color: '#f59e0b', icon: '📊' },
            { value: `${progressPercent}%`, label: 'Overall Progress', color: '#ec4899', icon: '🎯' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{stat.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
              <div style={{ color: '#94a3b8', marginTop: '5px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.85em', transition: 'width 0.5s' }}>
              {progressPercent > 10 && `${progressPercent}%`}
            </div>
          </div>
        </div>

        {/* Days Sections */}
        {[
          { title: '📚 Phase 1: Trading Foundations', days: [1,2,3,4,5,6,7], badge: 'Days 1-7' },
          { title: '📊 Phase 2: Technical Analysis', days: [8,9,10,11,12,13,14], badge: 'Days 8-14' },
          { title: '🎯 Phase 3: Advanced Strategies', days: [15,16,17,18,19,20,21], badge: 'Days 15-21' },
          { title: '💼 Phase 4: Portfolio Management', days: [22,23,24,25,26,27,28], badge: 'Days 22-28' },
          { title: '🎓 Phase 5: Assessment & Graduation', days: [29,30], badge: 'Days 29-30' },
        ].map((phase, pi) => (
          <div key={pi} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '30px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3em' }}>{phase.title}</h3>
              <span style={{ background: 'rgba(102, 126, 234, 0.2)', color: '#667eea', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85em' }}>{phase.badge}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '15px' }}>
              {phase.days.map(day => {
                const status = getDayStatus(day);
                const colors = {
                  completed: { bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#10b981' },
                  current: { bg: 'linear-gradient(135deg, #667eea, #764ba2)', border: '#667eea' },
                  locked: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
                };
                return (
                  <Link
                    key={day}
                    href={status !== 'locked' ? `/day/${day}` : '#'}
                    onClick={(e) => status === 'locked' && e.preventDefault()}
                    style={{
                      background: colors[status].bg,
                      border: `2px solid ${colors[status].border}`,
                      borderRadius: '16px',
                      padding: '20px 15px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: 'white',
                      cursor: status === 'locked' ? 'not-allowed' : 'pointer',
                      opacity: status === 'locked' ? 0.5 : 1,
                      transition: 'transform 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{day}</div>
                    <div style={{ fontSize: '1.5em', marginTop: '5px' }}>
                      {status === 'completed' ? '✓' : status === 'current' ? '▶' : '🔒'}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Affiliate Section */}
        <div style={{ background: 'linear-gradient(135deg, #78350f, #92400e)', borderRadius: '24px', padding: '40px', marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.5em' }}>💰 Your Affiliate Dashboard</h2>
            <span style={{ background: '#fbbf24', color: '#78350f', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold' }}>30% Commission</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            {[
              { value: profile?.total_referrals || 0, label: 'Total Referrals' },
              { value: `$${((profile?.total_earnings || 0) * 0.3).toFixed(2)}`, label: 'Pending Earnings' },
              { value: `$${(profile?.total_earnings || 0).toFixed(2)}`, label: 'Total Paid' },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '25px', textAlign: 'center' }}>
                <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#fbbf24' }}>{stat.value}</div>
                <div style={{ color: '#fde68a', marginTop: '5px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#fde68a', marginBottom: '15px' }}>Share your unique link and earn $12 for every friend who joins!</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={`https://marketwarrior.club/?ref=${profile?.affiliate_code || 'YOUR_CODE'}`}
              readOnly
              style={{ flex: 1, padding: '15px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white' }}
            />
            <button 
              onClick={() => navigator.clipboard.writeText(`https://marketwarrior.club/?ref=${profile?.affiliate_code}`)}
              style={{ padding: '15px 30px', background: '#fbbf24', color: '#78350f', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Certificate Section (if completed) */}
        {completedDays >= 30 && (
          <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '24px', padding: '40px', marginTop: '30px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2em', marginBottom: '15px' }}>🎉 Congratulations, Market Warrior!</h2>
            <p style={{ fontSize: '1.1em', marginBottom: '25px' }}>You've successfully completed the 30-Day Trading Challenge! Download your certificate below.</p>
            <Link href="/certificate" style={{ display: 'inline-block', padding: '15px 40px', background: 'white', color: '#059669', borderRadius: '10px', fontWeight: 'bold', textDecoration: 'none', fontSize: '1.1em' }}>
              🎓 View Your Certificate
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
