'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function JournalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase.from('trading_journal').select('*').eq('user_id', user.id).order('trade_date', { ascending: false });
      setTrades(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}><div className="spinner" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2em', marginBottom: '30px' }}>📊 Trading Journal</h1>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '15px', padding: '30px' }}>
          {trades.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No trades recorded yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Symbol</th>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Type</th>
                <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>P/L</th>
              </tr></thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: '15px' }}>{t.trade_date}</td>
                    <td style={{ padding: '15px' }}>{t.symbol}</td>
                    <td style={{ padding: '15px' }}>{t.trade_type}</td>
                    <td style={{ padding: '15px', color: t.profit_loss >= 0 ? '#10b981' : '#ef4444' }}>${t.profit_loss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
