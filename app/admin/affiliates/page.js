'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminAffiliates() {
  const supabase = createClient();
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAffiliates();
  }, []);

  async function loadAffiliates() {
    const { data } = await supabase
      .from('affiliates')
      .select('*, user_profiles(email, full_name)')
      .order('total_earnings', { ascending: false });

    setAffiliates(data || []);
    setLoading(false);
  }

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }} />;

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
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Earnings</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No affiliates yet</td></tr>
            ) : affiliates.map((aff) => (
              <tr key={aff.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px' }}>{aff.user_profiles?.full_name || aff.user_profiles?.email}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace' }}>{aff.affiliate_code}</td>
                <td style={{ padding: '16px' }}>{aff.total_referrals}</td>
                <td style={{ padding: '16px', fontWeight: 600, color: '#10b981' }}>${parseFloat(aff.total_earnings || 0).toFixed(2)}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: aff.is_active ? '#dcfce7' : '#fef2f2', color: aff.is_active ? '#10b981' : '#dc2626' }}>
                    {aff.is_active ? 'Active' : 'Inactive'}
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
