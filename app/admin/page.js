'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    paidUsers: 0,
    totalRevenue: 0,
    activeToday: 0,
    completionRate: 0
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    // Get user counts
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: paidUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_paid', true);

    // Get revenue
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    // Get recent payments
    const { data: recent } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get completion count
    const { count: completedUsers } = await supabase
      .from('challenge_progress')
      .select('user_id', { count: 'exact', head: true })
      .eq('day_number', 30)
      .eq('quiz_passed', true)
      .eq('task_completed', true);

    setStats({
      totalUsers: totalUsers || 0,
      paidUsers: paidUsers || 0,
      totalRevenue,
      completionRate: paidUsers ? Math.round((completedUsers || 0) / paidUsers * 100) : 0
    });
    setRecentPayments(recent || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="spinner" style={{ margin: '100px auto' }} />;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '32px', color: '#1e3a5f' }}>
        Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <StatCard label="Total Users" value={stats.totalUsers} icon="👥" />
        <StatCard label="Paid Users" value={stats.paidUsers} icon="💳" color="#10b981" />
        <StatCard label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon="💰" color="#667eea" />
        <StatCard label="Completion Rate" value={`${stats.completionRate}%`} icon="🎯" color="#f59e0b" />
      </div>

      {/* Recent Payments */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Recent Payments</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((payment) => (
              <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{payment.email}</td>
                <td style={{ padding: '12px' }}>${parseFloat(payment.amount).toFixed(2)}</td>
                <td style={{ padding: '12px' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: payment.status === 'completed' ? '#dcfce7' : '#fef2f2',
                    color: payment.status === 'completed' ? '#10b981' : '#dc2626'
                  }}>
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = '#1e3a5f' }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '8px' }}>{label}</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</p>
        </div>
        <span style={{ fontSize: '2rem' }}>{icon}</span>
      </div>
    </div>
  );
}
