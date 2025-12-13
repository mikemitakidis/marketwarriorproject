'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminPayments() {
  const supabase = createClient();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    setPayments(data || []);
    setLoading(false);
  }

  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a5f' }}>Payment History</h1>
        <div style={{ background: '#dcfce7', padding: '12px 24px', borderRadius: '8px' }}>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Revenue: </span>
          <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.25rem' }}>${totalRevenue.toFixed(2)}</span>
        </div>
      </div>
      
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Promo</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Affiliate</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px' }}>{payment.email}</td>
                <td style={{ padding: '16px', fontWeight: 600 }}>${parseFloat(payment.amount).toFixed(2)}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace', color: '#6b7280' }}>{payment.promo_code || '—'}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace', color: '#6b7280' }}>{payment.affiliate_code || '—'}</td>
                <td style={{ padding: '16px', color: '#6b7280' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#10b981' }}>
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
