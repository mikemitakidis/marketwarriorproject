'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const motivationalQuotes = [
  '"The stock market is filled with individuals who know the price of everything, but the value of nothing." — Phillip Fisher',
  '"Risk comes from not knowing what you\'re doing." — Warren Buffett',
  '"The four most dangerous words in investing are: This time it\'s different." — Sir John Templeton',
  '"In investing, what is comfortable is rarely profitable." — Robert Arnott',
  '"The goal of a successful trader is to make the best trades. Money is secondary." — Alexander Elder',
  '"Successful investing takes time, discipline and patience." — Warren Buffett',
  '"The market is a device for transferring money from the impatient to the patient." — Warren Buffett'
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState([]);
  const [stats, setStats] = useState({ completed: 0, current: 1, percent: 0, avgScore: 0 });
  const [affiliateStats, setAffiliateStats] = useState({ referrals: 0, pending: 0, paid: 0 });
  const [countdown, setCountdown] = useState(null);
  const [quote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (!prev || prev.total <= 0) return null;
        const total = prev.total - 1;
        return {
          total,
          hours: Math.floor(total / 3600),
          minutes: Math.floor((total % 3600) / 60),
          seconds: total % 60
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown?.total > 0]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile?.has_paid) {
      router.push('/checkout');
      return;
    }

    if (!profile?.agreed_to_terms) {
      router.push('/welcome');
      return;
    }

    setUser(user);
    setProfile(profile);
    await loadProgress();
    await loadAffiliateStats(user.id);
    setLoading(false);
  }

  async function loadProgress() {
    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const res = await fetch('/api/progress/status', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setProgress(data.days || []);
        
        // Calculate avg quiz score
        const quizScores = (data.days || []).filter(d => d.quiz_score > 0).map(d => d.quiz_score);
        const avgScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
        
        setStats({
          completed: data.stats?.completed_days || 0,
          current: data.stats?.current_day || 1,
          percent: data.stats?.progress_percent || 0,
          avgScore
        });

        // Calculate countdown if needed
        if (data.stats?.next_unlock_time) {
          const unlockTime = new Date(data.stats.next_unlock_time).getTime();
          const now = Date.now();
          const diff = Math.max(0, Math.floor((unlockTime - now) / 1000));
          if (diff > 0) {
            setCountdown({
              total: diff,
              hours: Math.floor(diff / 3600),
              minutes: Math.floor((diff % 3600) / 60),
              seconds: diff % 60
            });
          }
        }
      }
    } catch (err) {
      console.error('Load progress error:', err);
    }
  }

  async function loadAffiliateStats(userId) {
    try {
      // Use existing referrals table
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', userId);

      const totalReferrals = referrals?.length || 0;
      const pendingEarnings = referrals?.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.commission || 0), 0) || 0;
      const paidEarnings = referrals?.filter(r => r.status === 'paid').reduce((sum, r) => sum + parseFloat(r.commission || 0), 0) || 0;

      setAffiliateStats({
        referrals: totalReferrals,
        pending: pendingEarnings,
        paid: paidEarnings
      });
    } catch (err) {
      console.error('Load affiliate stats error:', err);
    }
  }

  async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  }

  function copyAffiliateLink() {
    const link = `${window.location.origin}/?ref=${profile?.affiliate_code || ''}`;
    navigator.clipboard.writeText(link);
    alert('Affiliate link copied!');
  }

  if (loading) {
    return (
      <>
        <style jsx global>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </>
    );
  }

  const phases = [
    { id: 1, title: '📚 Phase 1: Trading Foundations', days: [1, 2, 3, 4, 5, 6, 7], badge: 'Days 1-7' },
    { id: 2, title: '📊 Phase 2: Technical Analysis', days: [8, 9, 10, 11, 12, 13, 14], badge: 'Days 8-14' },
    { id: 3, title: '🎯 Phase 3: Advanced Strategies', days: [15, 16, 17, 18, 19, 20, 21], badge: 'Days 15-21' },
    { id: 4, title: '💼 Phase 4: Portfolio Management', days: [22, 23, 24, 25, 26, 27, 28], badge: 'Days 22-28' },
    { id: 5, title: '🎓 Phase 5: Assessment & Graduation', days: [29, 30], badge: 'Days 29-30' }
  ];

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Warrior';
  const userInitial = userName.charAt(0).toUpperCase();
  const commissionRate = profile?.has_paid ? '30%' : '25%';

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 5px 30px rgba(102, 126, 234, 0.6); }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        
        @media (max-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-actions { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .quick-actions { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .affiliate-stats { grid-template-columns: 1fr !important; }
          .welcome-content { flex-direction: column !important; }
          .user-details-hide { display: none !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .quick-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        minHeight: '100vh',
        color: '#f1f5f9'
      }}>
        {/* Header */}
        <header style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '15px 30px',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="Market Warrior" style={{ width: '45px', height: '45px', borderRadius: '10px' }} />
            <h1 style={{
              fontSize: '1.4em',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Market Warrior</h1>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-details-hide" style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'white' }}>{userName}</div>
                <div style={{ fontSize: '0.8em', color: '#10b981' }}>● Active Warrior</div>
              </div>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '1.1em',
                border: '2px solid rgba(255,255,255,0.2)'
              }}>{userInitial}</div>
            </div>
            {profile?.is_admin && (
              <Link href="/admin" style={{
                background: 'rgba(102, 126, 234, 0.2)',
                color: '#667eea',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9em'
              }}>Admin</Link>
            )}
            <button onClick={handleLogout} style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9em'
            }}>Logout</button>
          </div>
        </header>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 20px 40px' }}>
          {/* Welcome Section */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '30px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div className="welcome-content" style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '30px'
            }}>
              <div>
                <h2 style={{ fontSize: '2.2em', marginBottom: '10px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                  Welcome back, {userName.split(' ')[0]}! 🔥
                </h2>
                <p style={{ fontSize: '1.1em', opacity: 0.95, marginBottom: '15px' }}>
                  Your journey to becoming a confident trader continues.
                </p>
                <p style={{ fontStyle: 'italic', opacity: 0.85, fontSize: '0.95em' }}>{quote}</p>
              </div>
              {countdown && countdown.total > 0 && (
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '25px 35px',
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  <div style={{ fontSize: '0.9em', opacity: 0.9, marginBottom: '8px' }}>⏱️ Next Day Unlocks In</div>
                  <div style={{ fontSize: '2.2em', fontWeight: 700, fontFamily: "'SF Mono', Monaco, monospace", letterSpacing: '2px' }}>
                    {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.8em', opacity: 0.8, marginTop: '8px' }}>Complete today's quiz to progress!</div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            {[
              { icon: '📅', value: stats.current, label: 'CURRENT DAY', color: '#667eea' },
              { icon: '✅', value: stats.completed, label: 'DAYS COMPLETED', color: '#10b981' },
              { icon: '📊', value: `${stats.avgScore}%`, label: 'AVG QUIZ SCORE', color: '#f59e0b' },
              { icon: '💰', value: `$${affiliateStats.pending + affiliateStats.paid}`, label: 'AFFILIATE EARNINGS', color: '#3b82f6' }
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderTop: `4px solid ${stat.color}`,
                borderRadius: '16px',
                padding: '25px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2em', marginBottom: '15px' }}>{stat.icon}</div>
                <div style={{
                  fontSize: '2.8em',
                  fontWeight: 700,
                  background: `linear-gradient(135deg, ${stat.color}, ${stat.color}dd)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>{stat.value}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.9em', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <Link href={`/day/${stats.current}`} style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '16px',
              padding: '30px 20px',
              textAlign: 'center',
              textDecoration: 'none',
              color: 'white'
            }}>
              <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>▶️</div>
              <h3 style={{ fontSize: '1.1em', marginBottom: '8px' }}>Continue Learning</h3>
              <p style={{ fontSize: '0.85em', opacity: 0.8 }}>Pick up where you left off</p>
            </Link>
            <Link href="/journal" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '30px 20px',
              textAlign: 'center',
              textDecoration: 'none',
              color: 'white'
            }}>
              <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>📝</div>
              <h3 style={{ fontSize: '1.1em', marginBottom: '8px' }}>Trading Journal</h3>
              <p style={{ fontSize: '0.85em', color: '#94a3b8' }}>Track your trades & progress</p>
            </Link>
            {stats.completed >= 30 ? (
              <Link href="/certificate" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                textDecoration: 'none',
                color: 'white'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>🎓</div>
                <h3 style={{ fontSize: '1.1em', marginBottom: '8px' }}>Your Certificate</h3>
                <p style={{ fontSize: '0.85em', color: '#94a3b8' }}>Download your achievement</p>
              </Link>
            ) : (
              <a href="#affiliate" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                textDecoration: 'none',
                color: 'white'
              }}>
                <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>🤝</div>
                <h3 style={{ fontSize: '1.1em', marginBottom: '8px' }}>Refer & Earn</h3>
                <p style={{ fontSize: '0.85em', color: '#94a3b8' }}>Get {commissionRate} commission</p>
              </a>
            )}
            <a href="#progress" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '30px 20px',
              textAlign: 'center',
              textDecoration: 'none',
              color: 'white'
            }}>
              <div style={{ fontSize: '2.5em', marginBottom: '15px' }}>📈</div>
              <h3 style={{ fontSize: '1.1em', marginBottom: '8px' }}>View Progress</h3>
              <p style={{ fontSize: '0.85em', color: '#94a3b8' }}>See your journey</p>
            </a>
          </div>

          {/* Progress Section */}
          <div id="progress" style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '35px',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '1.5em' }}>📈 Your Challenge Progress</h2>
              <div style={{ fontSize: '1.8em', fontWeight: 700, color: '#667eea' }}>{stats.percent}%</div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                height: '24px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)',
                  borderRadius: '12px',
                  width: `${Math.max(stats.percent, 5)}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '15px',
                  fontWeight: 700,
                  fontSize: '0.85em',
                  minWidth: '60px',
                  transition: 'width 0.8s ease'
                }}>
                  {stats.percent}%
                </div>
              </div>
            </div>

            {/* Phases */}
            {phases.map(phase => (
              <div key={phase.id} style={{ marginBottom: '25px' }}>
                <h3 style={{ fontSize: '1.2em', marginBottom: '20px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {phase.title}
                  <span style={{
                    background: 'rgba(102, 126, 234, 0.2)',
                    color: '#667eea',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75em',
                    fontWeight: 600
                  }}>{phase.badge}</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '12px' }}>
                  {phase.days.map(day => {
                    const dayProgress = progress.find(p => p.day_number === day) || {};
                    const isUnlocked = dayProgress.unlocked;
                    const isCompleted = dayProgress.completed;
                    const isCurrent = day === stats.current && !isCompleted;

                    let bgStyle = { background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', opacity: 0.4, cursor: 'not-allowed' };
                    let statusText = '🔒';

                    if (isCompleted) {
                      bgStyle = {
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: '2px solid #10b981',
                        boxShadow: '0 5px 20px rgba(16, 185, 129, 0.3)',
                        opacity: 1,
                        cursor: 'pointer'
                      };
                      statusText = '✓';
                    } else if (isCurrent) {
                      bgStyle = {
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: '2px solid #667eea',
                        boxShadow: '0 5px 20px rgba(102, 126, 234, 0.4)',
                        animation: 'pulse 2s infinite',
                        opacity: 1,
                        cursor: 'pointer'
                      };
                      statusText = '▶';
                    } else if (isUnlocked) {
                      bgStyle = {
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        opacity: 1,
                        cursor: 'pointer'
                      };
                      statusText = '';
                    }

                    return (
                      <div
                        key={day}
                        onClick={() => isUnlocked ? router.push(`/day/${day}`) : null}
                        style={{
                          width: '65px',
                          height: '65px',
                          borderRadius: '50%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          transition: 'all 0.3s',
                          ...bgStyle
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '1.1em' }}>{day}</span>
                        <span style={{ fontSize: '0.7em', marginTop: '2px' }}>{statusText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Affiliate Section */}
          <div id="affiliate" style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '20px',
            padding: '35px',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
              <h2 style={{ color: '#fbbf24' }}>💰 Your Affiliate Dashboard</h2>
              <span style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1e293b',
                padding: '8px 20px',
                borderRadius: '25px',
                fontWeight: 700
              }}>{commissionRate} Commission</span>
            </div>

            <div className="affiliate-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8em', fontWeight: 700, color: '#fbbf24' }}>{affiliateStats.referrals}</div>
                <div style={{ color: '#d4a574', fontSize: '0.85em', marginTop: '5px' }}>Total Referrals</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8em', fontWeight: 700, color: '#fbbf24' }}>${affiliateStats.pending.toFixed(2)}</div>
                <div style={{ color: '#d4a574', fontSize: '0.85em', marginTop: '5px' }}>Pending Earnings</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8em', fontWeight: 700, color: '#fbbf24' }}>${affiliateStats.paid.toFixed(2)}</div>
                <div style={{ color: '#d4a574', fontSize: '0.85em', marginTop: '5px' }}>Total Paid</div>
              </div>
            </div>

            <p style={{ color: '#d4a574', marginBottom: '15px' }}>Share your unique link and earn ${profile?.has_paid ? '12' : '10'} for every friend who joins!</p>

            <div style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '8px' }}>
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/?ref=${profile?.affiliate_code || ''}` : ''}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fbbf24',
                  fontFamily: "'SF Mono', Monaco, monospace",
                  fontSize: '0.9em',
                  padding: '12px 15px',
                  outline: 'none'
                }}
              />
              <button onClick={copyAffiliateLink} style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1e293b',
                border: 'none',
                padding: '12px 25px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}>Copy Link</button>
            </div>
          </div>

          {/* Certificate Section */}
          {stats.completed >= 30 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center'
            }}>
              <h2 style={{ color: '#10b981', fontSize: '1.8em', marginBottom: '15px' }}>🎉 Congratulations, Market Warrior!</h2>
              <p style={{ color: '#94a3b8', marginBottom: '25px' }}>You've successfully completed the 30-Day Trading Challenge! Download your certificate below.</p>
              <Link href="/certificate" style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                textDecoration: 'none',
                padding: '15px 40px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1.1em'
              }}>🎓 View Your Certificate</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
