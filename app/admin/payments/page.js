'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function AdminPayments() {
  const supabase = createClient();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    loadPayments();
  }, [page, search]);

  async function loadPayments() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25'
      });
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/admin/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load payments');
      }
      
      setPayments(data.payments || []);
      setStats(data.stats || {});
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function markRefunded(paymentId) {
    const reason = prompt('Enter refund reason:');
    if (!reason) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'mark_refunded',
          payment_id: paymentId,
          reason
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }
      
      alert(data.message);
      await loadPayments();
    } catch (err) {
      alert(err.message);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a5f' }}>Payment History</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: '#dcfce7', padding: '12px 24px', borderRadius: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block' }}>Total Revenue</span>
            <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.25rem' }}>${stats.total_revenue || '0.00'}</span>
          </div>
          <div style={{ background: '#dbeafe', padding: '12px 24px', borderRadius: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block' }}>This Month</span>
            <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1.25rem' }}>${stats.month_revenue || '0.00'}</span>
          </div>
          <div style={{ background: '#fef3c7', padding: '12px 24px', borderRadius: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block' }}>Today</span>
            <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.25rem' }}>${stats.today_revenue || '0.00'}</span>
          </div>
        </div>
      </div>
      
      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            padding: '12px 16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            width: '300px'
          }}
        />
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
              <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No payments found</td></tr>
            ) : payments.map((payment) => (
              <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px' }}>{payment.email}</td>
                <td style={{ padding: '16px', fontWeight: 600 }}>${parseFloat(payment.amount).toFixed(2)}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace', color: '#6b7280' }}>{payment.promo_code || '—'}</td>
                <td style={{ padding: '16px', fontFamily: 'monospace', color: '#6b7280' }}>{payment.affiliate_code || '—'}</td>
                <td style={{ padding: '16px', color: '#6b7280' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    background: payment.status === 'completed' ? '#dcfce7' : payment.status === 'refunded' ? '#fef2f2' : '#fef3c7',
                    color: payment.status === 'completed' ? '#10b981' : payment.status === 'refunded' ? '#dc2626' : '#f59e0b'
                  }}>
                    {payment.status}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  {payment.status === 'completed' && (
                    <button
                      onClick={() => markRefunded(payment.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: '#fef2f2',
                        color: '#dc2626'
                      }}
                    >
                      Mark Refunded
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 16px' }}>
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: page === pagination.pages ? 'not-allowed' : 'pointer',
              opacity: page === pagination.pages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
