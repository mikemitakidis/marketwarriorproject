'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminUsers() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setUsers(data || []);
    setLoading(false);
  }

  const filtered = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ background: 'white', padding: '20px 30px', borderRadius: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2em', color: '#1e293b' }}>User Management</h1>
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '12px 20px', border: '2px solid #e2e8f0', borderRadius: '10px', width: '300px' }} />
      </div>
      <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '15px', textAlign: 'left' }}>User</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Progress</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Joined</th>
          </tr></thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '15px' }}><div style={{ fontWeight: 600 }}>{user.full_name || 'No name'}</div><div style={{ color: '#64748b', fontSize: '0.9em' }}>{user.email}</div></td>
                <td style={{ padding: '15px' }}><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.85em', background: user.has_paid ? '#dcfce7' : '#fef3c7', color: user.has_paid ? '#166534' : '#92400e' }}>{user.has_paid ? 'Paid' : 'Unpaid'}</span></td>
                <td style={{ padding: '15px' }}>Day {user.current_day || 1}/30</td>
                <td style={{ padding: '15px', color: '#64748b' }}>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}
      </div>
    </div>
  );
}
