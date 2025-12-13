'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminUsers() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
  }

  async function handleAction(userId, action, data = {}) {
    setActionLoading(userId);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ user_id: userId, action, data })
    });
    
    if (res.ok) {
      loadUsers();
    } else {
      alert('Action failed');
    }
    
    setActionLoading(null);
  }

  if (loading) {
    return <div className="spinner" style={{ margin: '100px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a5f' }}>User Management</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', width: '250px' }}
          />
          <button onClick={loadUsers} style={{ padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Search
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>User</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Joined</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Devices</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 500 }}>{user.full_name || 'No name'}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {user.is_paid && <Badge color="#10b981">Paid</Badge>}
                    {user.is_admin && <Badge color="#667eea">Admin</Badge>}
                    {!user.is_paid && <Badge color="#9ca3af">Free</Badge>}
                    {user.agreed_to_terms && <Badge color="#3b82f6">Terms ✓</Badge>}
                  </div>
                </td>
                <td style={{ padding: '16px', color: '#6b7280' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px', color: '#6b7280' }}>
                  {(user.device_ids?.length || 0)}/2
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <ActionBtn
                      onClick={() => handleAction(user.id, 'toggle_paid', { is_paid: !user.is_paid })}
                      loading={actionLoading === user.id}
                      color={user.is_paid ? '#dc2626' : '#10b981'}
                    >
                      {user.is_paid ? 'Revoke' : 'Grant'}
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => handleAction(user.id, 'toggle_admin', { is_admin: !user.is_admin })}
                      loading={actionLoading === user.id}
                      color={user.is_admin ? '#dc2626' : '#667eea'}
                    >
                      {user.is_admin ? 'Demote' : 'Admin'}
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => handleAction(user.id, 'reset_devices')}
                      loading={actionLoading === user.id}
                      color="#f59e0b"
                    >
                      Reset Devices
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: `${color}20`,
      color: color
    }}>
      {children}
    </span>
  );
}

function ActionBtn({ children, onClick, loading, color }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '6px 12px',
        background: `${color}15`,
        color: color,
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.5 : 1
      }}
    >
      {children}
    </button>
  );
}
