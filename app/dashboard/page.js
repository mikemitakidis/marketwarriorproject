'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState([]);
  const [stats, setStats] = useState({ completed: 0, current: 1, percent: 0 });
  const [feedItems, setFeedItems] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.is_paid) {
      router.push('/checkout');
      return;
    }

    if (!profile?.agreed_to_terms) {
      router.push('/welcome');
      return;
    }

    setUser(user);
    setProfile(profile);
    loadProgress();
    loadFeed();
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
        setStats({
          completed: data.stats?.completed_days || 0,
          current: data.stats?.current_day || 1,
          percent: data.stats?.progress_percent || 0
        });
      }
    } catch (err) {
      console.error('Load progress error:', err);
    }
    
    setLoading(false);
  }

  async function loadFeed() {
    try {
      const res = await fetch('/api/admin/live-feed');
      if (res.ok) {
        const data = await res.json();
        setFeedItems((data.feed_items || []).slice(0, 3)); // Show latest 3
      }
    } catch (err) {
      console.error('Load feed error:', err);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e3a5f' }}>📈 Market Warrior</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/journal" style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
              📊 Trading Journal
            </Link>
            {profile?.is_admin && (
              <Link href="/admin" style={{ padding: '8px 16px', background: '#667eea', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>
                Admin Panel
              </Link>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Live Feed Announcements */}
        {feedItems.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {feedItems.map(item => (
              <div key={item.id} style={{
                background: item.is_pinned ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'white',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{item.is_pinned ? '📌' : '📢'}</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 600, margin: '0 0 4px 0', color: '#1e3a5f' }}>{item.title}</h3>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>{item.content}</p>
                  {item.link_url && (
                    <a href={item.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontSize: '0.875rem', marginTop: '8px', display: 'inline-block' }}>
                      {item.link_text || 'Learn more'} →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px' }}>Days Completed</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{stats.completed}/30</div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px' }}>Current Day</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#667eea' }}>Day {stats.current}</div>
          </div>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px' }}>Progress</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.percent}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Your Progress</span>
            <span style={{ color: '#6b7280' }}>{stats.completed} of 30 days</span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: '8px', height: '12px', overflow: 'hidden' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              height: '100%', 
              width: `${stats.percent}%`,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const dayProgress = progress.find(p => p.day_number === day) || {};
            const isUnlocked = dayProgress.unlocked;
            const isCompleted = dayProgress.completed;
            const isCurrent = day === stats.current;

            return (
              <Link
                key={day}
                href={isUnlocked ? `/day/${day}` : '#'}
                style={{
                  background: isCompleted ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                             isCurrent ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                             isUnlocked ? 'white' : '#f1f5f9',
                  color: (isCompleted || isCurrent) ? 'white' : isUnlocked ? '#1e3a5f' : '#9ca3af',
                  padding: '24px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  boxShadow: isUnlocked ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
              >
                {isCompleted && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '1rem' }}>✓</span>
                )}
                {!isUnlocked && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '1rem' }}>🔒</span>
                )}
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>DAY</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{day}</div>
                {isCurrent && !isCompleted && (
                  <div style={{ fontSize: '0.625rem', marginTop: '4px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                    CURRENT
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Certificate Link */}
        {stats.completed === 30 && (
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link
              href="/certificate"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                color: '#1e3a5f',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1.125rem',
                boxShadow: '0 4px 12px rgba(255, 193, 7, 0.4)'
              }}
            >
              🏆 Get Your Certificate!
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
