'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminAffiliates() {
  const supabase = createClient();
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadAffiliates();
  }, []);

  async function loadAffiliates() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/affiliates', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load affiliates');
      }
      
      setAffiliates(data.affiliates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAffiliateStatus(affiliateId, currentStatus) {
    setActionLoading(affiliateId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'update',
          affiliate_id: affiliateId,
          is_active: !currentStatus
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update affiliate');
      }
      
      await loadAffiliates(); // Reload
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function markPayout(affiliateId) {
    if (!confirm('Mark pending earnings as paid? (Make sure you have actually paid them!)')) return;
    
    setActionLoading(affiliateId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'payout',
          affiliate_id: affiliateId
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process payout');
      }
      
      alert(data.message);
      await loadAffiliates(); // Reload
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }} />;
  
  if (error) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
      Error: {error}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '24px', color: '#1e3a5f' }}>Affiliate Management</h1>
      
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Affiliate</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Referrals</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Total Earned</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Pending</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No affiliates yet</td></tr>
            ) : affiliates.map((aff) => (
              <tr key={aff.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px' }}>
                  <div>{aff.user_profiles?.full_name || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{aff.user_profiles?.email}</div>
                </td>
                <td style={{ padding: '16px', fontFamily: 'monospace', background: '#f8fafc' }}>{aff.affiliate_code}</td>
                <td style={{ padding: '16px' }}>
                  {aff.total_referrals}
                  {aff.pending_referrals > 0 && (
                    <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '0.75rem' }}>
                      ({aff.pending_referrals} pending)
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#10b981' }}>
                  ${parseFloat(aff.total_earnings || 0).toFixed(2)}
                </td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#f59e0b' }}>
                  ${parseFloat(aff.pending_earnings || 0).toFixed(2)}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    background: aff.is_active ? '#dcfce7' : '#fef2f2', 
                    color: aff.is_active ? '#10b981' : '#dc2626' 
                  }}>
                    {aff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleAffiliateStatus(aff.id, aff.is_active)}
                      disabled={actionLoading === aff.id}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: aff.is_active ? '#fef2f2' : '#dcfce7',
                        color: aff.is_active ? '#dc2626' : '#10b981'
                      }}
                    >
                      {aff.is_active ? 'Disable' : 'Enable'}
                    </button>
                    {parseFloat(aff.pending_earnings || 0) > 0 && (
                      <button
                        onClick={() => markPayout(aff.id)}
                        disabled={actionLoading === aff.id}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: '#667eea',
                          color: 'white'
                        }}
                      >
                        Mark Paid
                      </button>
                    )}
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
