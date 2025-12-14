'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminPromo() {
  const supabase = createClient();
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', discount_percent: 10, max_uses: 100 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  async function loadPromoCodes() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch('/api/admin/promo', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      setPromoCodes(data.promo_codes || []);
    }
    setLoading(false);
  }

  async function createPromoCode() {
    if (!newCode.code) return;
    setCreating(true);

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify(newCode)
    });

    if (res.ok) {
      setNewCode({ code: '', discount_percent: 10, max_uses: 100 });
      setShowForm(false);
      loadPromoCodes();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create promo code');
    }
    
    setCreating(false);
  }

  async function toggleActive(id, currentStatus) {
    const { data: { session } } = await supabase.auth.getSession();

    await fetch('/api/admin/promo', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ id, is_active: !currentStatus })
    });
    
    loadPromoCodes();
  }

  if (loading) {
    return <div className="spinner" style={{ margin: '100px auto' }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a5f' }}>Promo Codes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Create Code
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Create New Promo Code</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Code</label>
              <input
                type="text"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2025"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Discount %</label>
              <input
                type="number"
                value={newCode.discount_percent}
                onChange={(e) => setNewCode({ ...newCode, discount_percent: parseInt(e.target.value) })}
                min="1"
                max="100"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Max Uses</label>
              <input
                type="number"
                value={newCode.max_uses}
                onChange={(e) => setNewCode({ ...newCode, max_uses: parseInt(e.target.value) })}
                min="1"
                style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
            </div>
          </div>
          <button
            onClick={createPromoCode}
            disabled={creating}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: creating ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer'
            }}
          >
            {creating ? 'Creating...' : 'Create Code'}
          </button>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Discount</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Usage</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No promo codes yet</td></tr>
            ) : promoCodes.map((promo) => (
              <tr key={promo.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px', fontWeight: 600, fontFamily: 'monospace' }}>{promo.code}</td>
                <td style={{ padding: '16px' }}>{promo.discount_percent}%</td>
                <td style={{ padding: '16px' }}>{promo.current_uses || 0} / {promo.max_uses || '∞'}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: promo.is_active ? '#dcfce7' : '#fef2f2',
                    color: promo.is_active ? '#10b981' : '#dc2626'
                  }}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <button
                    onClick={() => toggleActive(promo.id, promo.is_active)}
                    style={{
                      padding: '6px 12px',
                      background: promo.is_active ? '#fef2f2' : '#dcfce7',
                      color: promo.is_active ? '#dc2626' : '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {promo.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
