'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function JournalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0 });
  
  const [formData, setFormData] = useState({
    symbol: '',
    trade_type: 'long',
    entry_price: '',
    exit_price: '',
    quantity: '',
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: '',
    notes: '',
    strategy: '',
    emotions: '',
    lessons_learned: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    loadTrades();
  }

  async function loadTrades() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('trading_journal')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (!error && data) {
      setTrades(data);
      calculateStats(data);
    }
    setLoading(false);
  }

  function calculateStats(tradeList) {
    const total = tradeList.length;
    let wins = 0;
    let totalPnL = 0;

    tradeList.forEach(trade => {
      if (trade.pnl !== null) {
        totalPnL += parseFloat(trade.pnl) || 0;
        if (parseFloat(trade.pnl) > 0) wins++;
      }
    });

    const closedTrades = tradeList.filter(t => t.exit_price !== null).length;
    const winRate = closedTrades > 0 ? ((wins / closedTrades) * 100).toFixed(1) : 0;

    setStats({
      total,
      wins,
      losses: closedTrades - wins,
      winRate,
      totalPnL: totalPnL.toFixed(2)
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    // Calculate P&L
    let pnl = null;
    if (formData.exit_price && formData.entry_price && formData.quantity) {
      const entryTotal = parseFloat(formData.entry_price) * parseFloat(formData.quantity);
      const exitTotal = parseFloat(formData.exit_price) * parseFloat(formData.quantity);
      pnl = formData.trade_type === 'long' 
        ? (exitTotal - entryTotal).toFixed(2)
        : (entryTotal - exitTotal).toFixed(2);
    }

    const tradeData = {
      user_id: user.id,
      ...formData,
      entry_price: parseFloat(formData.entry_price) || null,
      exit_price: formData.exit_price ? parseFloat(formData.exit_price) : null,
      quantity: parseFloat(formData.quantity) || null,
      pnl: pnl ? parseFloat(pnl) : null
    };

    if (editingTrade) {
      await supabase.from('trading_journal').update(tradeData).eq('id', editingTrade.id);
    } else {
      await supabase.from('trading_journal').insert(tradeData);
    }

    resetForm();
    loadTrades();
  }

  function resetForm() {
    setFormData({
      symbol: '',
      trade_type: 'long',
      entry_price: '',
      exit_price: '',
      quantity: '',
      entry_date: new Date().toISOString().split('T')[0],
      exit_date: '',
      notes: '',
      strategy: '',
      emotions: '',
      lessons_learned: ''
    });
    setShowForm(false);
    setEditingTrade(null);
  }

  function editTrade(trade) {
    setFormData({
      symbol: trade.symbol || '',
      trade_type: trade.trade_type || 'long',
      entry_price: trade.entry_price || '',
      exit_price: trade.exit_price || '',
      quantity: trade.quantity || '',
      entry_date: trade.entry_date?.split('T')[0] || '',
      exit_date: trade.exit_date?.split('T')[0] || '',
      notes: trade.notes || '',
      strategy: trade.strategy || '',
      emotions: trade.emotions || '',
      lessons_learned: trade.lessons_learned || ''
    });
    setEditingTrade(trade);
    setShowForm(true);
  }

  async function deleteTrade(id) {
    if (confirm('Delete this trade entry?')) {
      await supabase.from('trading_journal').delete().eq('id', id);
      loadTrades();
    }
  }

  async function exportToExcel() {
    setExporting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/journal/export', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading-journal-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export. Please try again.');
    }
    
    setExporting(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Link href="/dashboard" style={{ color: '#667eea', fontSize: '0.875rem' }}>← Dashboard</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e3a5f', marginTop: '4px' }}>📊 Trading Journal</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={exportToExcel}
              disabled={exporting || trades.length === 0}
              style={{
                padding: '10px 20px',
                background: trades.length === 0 ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: trades.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {exporting ? 'Exporting...' : '📥 Export to Excel'}
            </button>
            <button
              onClick={() => setShowForm(true)}
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
              + Add Trade
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Trades', value: stats.total, color: '#667eea' },
            { label: 'Wins', value: stats.wins, color: '#10b981' },
            { label: 'Losses', value: stats.losses, color: '#dc2626' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: '#f59e0b' },
            { label: 'Total P&L', value: `$${stats.totalPnL}`, color: parseFloat(stats.totalPnL) >= 0 ? '#10b981' : '#dc2626' }
          ].map((stat, i) => (
            <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Trade Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '600px', maxHeight: '90vh', overflow: 'auto' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>
                {editingTrade ? 'Edit Trade' : 'Add New Trade'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Symbol *</label>
                    <input type="text" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} required
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} placeholder="AAPL" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Type</label>
                    <select value={formData.trade_type} onChange={(e) => setFormData({...formData, trade_type: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }}>
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Entry Price *</label>
                    <input type="number" step="0.01" value={formData.entry_price} onChange={(e) => setFormData({...formData, entry_price: e.target.value})} required
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Exit Price</label>
                    <input type="number" step="0.01" value={formData.exit_price} onChange={(e) => setFormData({...formData, exit_price: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Quantity *</label>
                    <input type="number" step="0.01" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Strategy</label>
                    <input type="text" value={formData.strategy} onChange={(e) => setFormData({...formData, strategy: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} placeholder="e.g., Breakout" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Entry Date</label>
                    <input type="date" value={formData.entry_date} onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Exit Date</label>
                    <input type="date" value={formData.exit_date} onChange={(e) => setFormData({...formData, exit_date: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} />
                  </div>
                </div>
                
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} placeholder="Trade setup, reasoning..." />
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Emotions During Trade</label>
                  <input type="text" value={formData.emotions} onChange={(e) => setFormData({...formData, emotions: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} placeholder="Confident, anxious, FOMO..." />
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>Lessons Learned</label>
                  <textarea value={formData.lessons_learned} onChange={(e) => setFormData({...formData, lessons_learned: e.target.value})} rows={2}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '6px' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" onClick={resetForm}
                    style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ flex: 1, padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    {editingTrade ? 'Update Trade' : 'Add Trade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Trades Table */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Symbol</th>
                <th style={{ textAlign: 'left', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'right', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Entry</th>
                <th style={{ textAlign: 'right', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Exit</th>
                <th style={{ textAlign: 'right', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '16px', color: '#6b7280', fontWeight: 600 }}>P&L</th>
                <th style={{ textAlign: 'center', padding: '16px', color: '#6b7280', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                  No trades yet. Click "Add Trade" to start journaling!
                </td></tr>
              ) : trades.map(trade => (
                <tr key={trade.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px' }}>{trade.entry_date?.split('T')[0] || '-'}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>{trade.symbol}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      background: trade.trade_type === 'long' ? '#dcfce7' : '#fee2e2',
                      color: trade.trade_type === 'long' ? '#10b981' : '#dc2626' }}>
                      {trade.trade_type?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>${parseFloat(trade.entry_price || 0).toFixed(2)}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>{trade.exit_price ? `$${parseFloat(trade.exit_price).toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>{trade.quantity}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: parseFloat(trade.pnl || 0) >= 0 ? '#10b981' : '#dc2626' }}>
                    {trade.pnl ? `$${parseFloat(trade.pnl).toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button onClick={() => editTrade(trade)} style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Edit</button>
                    <button onClick={() => deleteTrade(trade.id)} style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
