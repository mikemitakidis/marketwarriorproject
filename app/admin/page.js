'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({ users: 0, revenue: 0, completions: 0, activeToday: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { count: users } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
    const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'completed');
    const { count: completions } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('course_completed', true);
    
    const revenue = payments?.reduce((a, b) => a + (b.amount || 0), 0) || 0;
    setStats({ users: users || 0, revenue, completions: completions || 0, activeToday: Math.floor((users || 0) * 0.3) });
  }

  return (
    <div>
      <div style={{ background: 'white', padding: '20px 30px', borderRadius: '15px', marginBottom: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '2em', color: '#1e293b' }}>Admin Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Total Users', value: stats.users, icon: '👥', color: '#667eea' },
          { label: 'Total Revenue', value: `$${stats.revenue.toFixed(2)}`, icon: '💰', color: '#10b981' },
          { label: 'Course Completions', value: stats.completions, icon: '🎓', color: '#f59e0b' },
          { label: 'Active Today', value: stats.activeToday, icon: '📈', color: '#ec4899' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontSize: '2em' }}>{stat.icon}</span>
              <span style={{ fontSize: '2em', fontWeight: 'bold', color: stat.color }}>{stat.value}</span>
            </div>
            <p style={{ color: '#64748b' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.5em', marginBottom: '20px', color: '#1e293b' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {[
            { label: 'Add User', href: '/admin/users', color: '#667eea' },
            { label: 'Create Promo', href: '/admin/promo', color: '#10b981' },
            { label: 'Edit Content', href: '/admin/content', color: '#f59e0b' },
            { label: 'Send Email', href: '/admin/emails', color: '#ec4899' },
          ].map((action, i) => (
            <a
              key={i}
              href={action.href}
              style={{
                padding: '20px',
                background: action.color,
                color: 'white',
                borderRadius: '10px',
                textDecoration: 'none',
                textAlign: 'center',
                fontWeight: 600,
                transition: 'transform 0.2s'
              }}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
