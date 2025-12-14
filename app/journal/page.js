'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export default function Journal() {
  const supabase = createClient();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    loadTrades();
  }, []);

  async function loadTrades() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trading_journal')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });

      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableExists(false);
        } else {
          setError(error.message);
        }
      } else {
        setTrades(data || []);
      }
    } catch (err) {
      console.error('Error loading trades:', err);
      setTableExists(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1628', padding: '40px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
            📊 Trading Journal
          </h1>
          <div style={{ background: '#1e3a5f', borderRadius: '12px', padding: '40px', color: '#94a3b8' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
              The Trading Journal feature is coming soon!
            </p>
            <p>
              Track your trades, analyze your performance, and improve your trading strategy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
          📊 Trading Journal
        </h1>
        
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div style={{ background: '#1e3a5f', borderRadius: '12px', padding: '20px' }}>
          {trades.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
              No trades recorded yet. Start tracking your trades!
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#94a3b8' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#94a3b8' }}>Symbol</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: '#94a3b8' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: '#94a3b8' }}>P/L</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px' }}>{new Date(trade.trade_date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>{trade.symbol}</td>
                    <td style={{ padding: '12px' }}>{trade.trade_type}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: trade.profit_loss >= 0 ? '#22c55e' : '#ef4444' }}>
                      ${trade.profit_loss?.toFixed(2) || '0.00'}
                    </td>
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
