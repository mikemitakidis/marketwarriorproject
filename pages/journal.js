import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../lib/serverAuth';

/**
 * Paid Trading Journal - Full-featured journal for paid users
 *
 * Features:
 * - Add new trade entries with symbol, side, entry/exit prices, notes
 * - View trade history
 * - Calculate P&L
 * - Styled consistently with the rest of the app
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const gate = await getGateStatus(user.id);
    if (!gate.hasPaid) {
      return { redirect: { destination: '/free-journal', permanent: false } };
    }
    if (!gate.welcomeCompleted) {
      return { redirect: { destination: '/welcome', permanent: false } };
    }

    const supabase = getServiceSupabase();

    // Fetch existing journal entries
    const { data: entries } = await supabase
      .from('trading_journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return {
      props: {
        userId: user.id,
        userName: gate.fullName || 'Trader',
        initialEntries: entries || [],
      },
    };
  } catch (err) {
    console.error('Journal error:', err);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function JournalPage({ userId, userName, initialEntries = [] }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: '',
    side: 'buy',
    entry_price: '',
    exit_price: '',
    quantity: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symbol.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/journal/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: form.symbol.trim().toUpperCase(),
          side: form.side,
          entry_price: form.entry_price ? parseFloat(form.entry_price) : null,
          exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
          quantity: form.quantity ? parseFloat(form.quantity) : null,
          notes: form.notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add entry');

      setEntries([data, ...entries]);
      setForm({ symbol: '', side: 'buy', entry_price: '', exit_price: '', quantity: '', notes: '' });
      setSuccess('Trade entry added successfully!');
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePnL = (entry) => {
    if (!entry.entry_price || !entry.exit_price || !entry.quantity) return null;
    const diff = entry.side === 'buy'
      ? (entry.exit_price - entry.entry_price)
      : (entry.entry_price - entry.exit_price);
    return (diff * entry.quantity).toFixed(2);
  };

  return (
    <>
      <Head>
        <title>Trading Journal - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: white;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 700;
          color: #667eea;
          text-decoration: none;
        }
        .user-section { display: flex; align-items: center; gap: 16px; }
        .user-name { color: #94a3b8; }
        .logout-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 24px; }
        .back-link {
          color: #667eea;
          text-decoration: none;
          margin-bottom: 16px;
          display: inline-block;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 { font-size: 2rem; }
        .btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { background: #334155; }
        .form-card {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .form-card h2 { margin-bottom: 16px; color: #667eea; }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { color: #94a3b8; font-size: 0.875rem; }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 1rem;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #667eea;
          outline: none;
        }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .form-actions { display: flex; gap: 12px; }
        .message { padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        .message.error { background: #991b1b; color: #fecaca; }
        .message.success { background: #166534; color: #bbf7d0; }
        .entries-section { background: #1e293b; border-radius: 12px; overflow: hidden; }
        .entries-header {
          padding: 16px 24px;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .entries-header h2 { color: #667eea; }
        .entries-count { color: #64748b; }
        .entries-list { padding: 0; }
        .entry-item {
          padding: 16px 24px;
          border-bottom: 1px solid #334155;
          display: grid;
          grid-template-columns: 1fr 100px 120px 120px 100px;
          gap: 16px;
          align-items: center;
        }
        .entry-item:last-child { border-bottom: none; }
        .entry-symbol {
          font-weight: 600;
          font-size: 1.1rem;
        }
        .entry-side {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          text-align: center;
        }
        .entry-side.buy { background: #166534; color: #bbf7d0; }
        .entry-side.sell { background: #991b1b; color: #fecaca; }
        .entry-prices { color: #94a3b8; font-size: 0.875rem; }
        .entry-pnl { font-weight: 600; text-align: right; }
        .entry-pnl.positive { color: #22c55e; }
        .entry-pnl.negative { color: #ef4444; }
        .entry-date { color: #64748b; font-size: 0.875rem; text-align: right; }
        .entry-notes {
          grid-column: 1 / -1;
          color: #94a3b8;
          font-size: 0.875rem;
          padding-top: 8px;
          border-top: 1px dashed #334155;
          margin-top: 8px;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        .empty-state h3 { color: #94a3b8; margin-bottom: 8px; }
        @media (max-width: 768px) {
          .entry-item {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .entry-pnl, .entry-date { text-align: left; }
        }
      `}</style>

      <header className="header">
        <Link href="/dashboard" className="logo">Market Warrior</Link>
        <div className="user-section">
          <span className="user-name">{userName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="container">
        <Link href="/dashboard" className="back-link">← Back to Dashboard</Link>

        <div className="page-header">
          <h1>📊 Trading Journal</h1>
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Entry'}
          </button>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {showForm && (
          <div className="form-card">
            <h2>Add Trade Entry</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Symbol *</label>
                  <input
                    type="text"
                    placeholder="e.g., AAPL, BTC"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Side</label>
                  <select
                    value={form.side}
                    onChange={(e) => setForm({ ...form, side: e.target.value })}
                  >
                    <option value="buy">Buy (Long)</option>
                    <option value="sell">Sell (Short)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.entry_price}
                    onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Exit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.exit_price}
                    onChange={(e) => setForm({ ...form, exit_price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Notes</label>
                <textarea
                  placeholder="Trade rationale, lessons learned..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Add Entry'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="entries-section">
          <div className="entries-header">
            <h2>Trade History</h2>
            <span className="entries-count">{entries.length} entries</span>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">
              <h3>No trades logged yet</h3>
              <p>Start tracking your trades to improve your performance!</p>
            </div>
          ) : (
            <div className="entries-list">
              {entries.map((entry) => {
                const pnl = calculatePnL(entry);
                return (
                  <div key={entry.id} className="entry-item">
                    <div className="entry-symbol">{entry.symbol}</div>
                    <div className={`entry-side ${entry.side}`}>{entry.side}</div>
                    <div className="entry-prices">
                      {entry.entry_price ? `$${entry.entry_price}` : '-'} → {entry.exit_price ? `$${entry.exit_price}` : '-'}
                    </div>
                    <div className={`entry-pnl ${pnl && parseFloat(pnl) >= 0 ? 'positive' : 'negative'}`}>
                      {pnl ? `${parseFloat(pnl) >= 0 ? '+' : ''}$${pnl}` : '-'}
                    </div>
                    <div className="entry-date">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                    {entry.notes && (
                      <div className="entry-notes">📝 {entry.notes}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
