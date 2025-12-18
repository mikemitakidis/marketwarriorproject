import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUserFromRequest, getGateStatus, getServiceSupabase } from '../lib/serverAuth';

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [budget, setBudget] = useState(10000);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget] = useState('10000');

  // Form state
  const [form, setForm] = useState({
    symbol: '',
    side: 'buy',
    entry_price: '',
    exit_price: '',
    quantity: '',
    stop_loss: '',
    take_profit: '',
    notes: '',
    strategy: '',
    emotions: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculator state
  const [calcRisk, setCalcRisk] = useState({ accountSize: '', riskPercent: '', entryPrice: '', stopLoss: '' });
  const [calcResult, setCalcResult] = useState(null);

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
      setForm({ symbol: '', side: 'buy', entry_price: '', exit_price: '', quantity: '', stop_loss: '', take_profit: '', notes: '', strategy: '', emotions: '' });
      setSuccess('Trade entry added successfully!');
      setActiveTab('history');
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

  // Calculate metrics
  const totalPnL = entries.reduce((sum, e) => {
    const pnl = calculatePnL(e);
    return sum + (pnl ? parseFloat(pnl) : 0);
  }, 0);

  const winningTrades = entries.filter(e => {
    const pnl = calculatePnL(e);
    return pnl && parseFloat(pnl) > 0;
  }).length;

  const losingTrades = entries.filter(e => {
    const pnl = calculatePnL(e);
    return pnl && parseFloat(pnl) < 0;
  }).length;

  const winRate = entries.length > 0 ? ((winningTrades / entries.length) * 100).toFixed(1) : 0;

  const calculatePositionSize = () => {
    const { accountSize, riskPercent, entryPrice, stopLoss } = calcRisk;
    if (!accountSize || !riskPercent || !entryPrice || !stopLoss) return;

    const riskAmount = (parseFloat(accountSize) * parseFloat(riskPercent)) / 100;
    const priceDiff = Math.abs(parseFloat(entryPrice) - parseFloat(stopLoss));
    const shares = priceDiff > 0 ? Math.floor(riskAmount / priceDiff) : 0;

    setCalcResult({
      riskAmount: riskAmount.toFixed(2),
      shares,
      positionValue: (shares * parseFloat(entryPrice)).toFixed(2),
    });
  };

  return (
    <>
      <Head>
        <title>Market Warrior Trading Journal | Professional Edition</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
          color: #e0e0e0;
          min-height: 100vh;
          overflow-x: hidden;
        }
      `}</style>

      <style jsx>{`
        /* Watermark */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          font-weight: bold;
          color: rgba(255, 255, 255, 0.03);
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
        }

        /* Header */
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px 40px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          position: relative;
          z-index: 10;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 15px;
          text-decoration: none;
        }

        .logo-icon {
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }

        .logo-text h1 {
          font-size: 24px;
          color: white;
          margin-bottom: 2px;
        }

        .logo-text p {
          font-size: 12px;
          color: rgba(255,255,255,0.8);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .budget-display {
          background: rgba(255,255,255,0.2);
          padding: 10px 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }

        .budget-display label {
          font-size: 12px;
          color: rgba(255,255,255,0.8);
          display: block;
          margin-bottom: 5px;
        }

        .budget-value {
          font-size: 20px;
          font-weight: bold;
          color: white;
        }

        .edit-budget-btn {
          background: rgba(255,255,255,0.3);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .edit-budget-btn:hover {
          background: rgba(255,255,255,0.4);
          transform: translateY(-2px);
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.3);
          color: white;
          border: 1px solid rgba(239, 68, 68, 0.5);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.5);
        }

        /* Navigation Tabs */
        .nav-tabs {
          background: rgba(30, 30, 46, 0.95);
          padding: 0 40px;
          display: flex;
          gap: 5px;
          max-width: 1400px;
          margin: 0 auto;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          overflow-x: auto;
        }

        .tab-btn {
          padding: 15px 25px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: white;
          background: rgba(255,255,255,0.05);
        }

        .tab-btn.active {
          color: #667eea;
          border-bottom-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }

        /* Main Container */
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px 40px;
          position: relative;
          z-index: 5;
        }

        /* Tab Content */
        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .metric-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 25px;
          text-align: center;
          transition: all 0.3s;
        }

        .metric-card:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .metric-label {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 10px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: bold;
          color: white;
        }

        .metric-value.positive { color: #4ade80; }
        .metric-value.negative { color: #f87171; }

        /* Form Sections */
        .form-section {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 30px;
        }

        .form-section h3 {
          margin-bottom: 20px;
          color: #667eea;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          margin-bottom: 8px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 12px 15px;
          color: white;
          font-size: 14px;
          transition: all 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }

        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-group select option {
          background: #2d2d44;
          color: white;
        }

        /* Buttons */
        .btn {
          padding: 12px 25px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .btn-secondary:hover {
          background: rgba(255,255,255,0.2);
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(16, 185, 129, 0.4);
        }

        /* Trade Table */
        .trade-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .trade-table th,
        .trade-table td {
          padding: 15px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .trade-table th {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
        }

        .trade-table tbody tr:hover {
          background: rgba(255,255,255,0.05);
        }

        .positive { color: #4ade80; }
        .negative { color: #f87171; }

        .status-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-open {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .status-closed {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
        }

        /* Calculator Results */
        .calc-results {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .calc-result-item {
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }

        .calc-result-label {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 5px;
        }

        .calc-result-value {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }

        /* Modal */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal.active {
          display: flex;
        }

        .modal-content {
          background: linear-gradient(135deg, #2d2d44, #1e1e2e);
          padding: 40px;
          border-radius: 20px;
          max-width: 500px;
          width: 90%;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .modal-content h2 {
          margin-bottom: 20px;
          color: #667eea;
        }

        /* Message */
        .message {
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .message.error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .message.success {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255,255,255,0.5);
        }

        .empty-state h3 {
          margin-bottom: 10px;
          color: rgba(255,255,255,0.7);
        }

        /* Psychology Section */
        .psychology-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .psychology-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 15px;
          padding: 25px;
        }

        .psychology-card h4 {
          color: #667eea;
          margin-bottom: 15px;
        }

        .emotion-tag {
          display: inline-block;
          padding: 8px 16px;
          margin: 5px;
          border-radius: 20px;
          background: rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.3s;
        }

        .emotion-tag:hover,
        .emotion-tag.selected {
          background: rgba(102, 126, 234, 0.3);
          border-color: #667eea;
        }

        /* Footer */
        .footer {
          text-align: center;
          padding: 30px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin-top: 50px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .header { padding: 15px 20px; }
          .header-content { flex-direction: column; gap: 15px; }
          .nav-tabs { padding: 0 15px; }
          .container { padding: 20px 15px; }
          .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Watermark */}
      <div className="watermark">MARKET WARRIOR</div>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link href="/dashboard" className="logo">
            <div className="logo-icon">MW</div>
            <div className="logo-text">
              <h1>Trading Journal</h1>
              <p>Professional Edition v4</p>
            </div>
          </Link>

          <div className="header-right">
            <div className="budget-display">
              <label>Trading Capital</label>
              <div className="budget-value">${budget.toLocaleString()}</div>
            </div>
            <button className="edit-budget-btn" onClick={() => setShowBudgetModal(true)}>
              Edit Budget
            </button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          📊 Dashboard
        </button>
        <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
          ➕ Add Trade
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📋 History
        </button>
        <button className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`} onClick={() => setActiveTab('calculator')}>
          🧮 Calculator
        </button>
        <button className={`tab-btn ${activeTab === 'psychology' ? 'active' : ''}`} onClick={() => setActiveTab('psychology')}>
          🧠 Psychology
        </button>
      </nav>

      {/* Main Container */}
      <div className="container">
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Dashboard Tab */}
        <div className={`tab-content ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <div className="dashboard-grid">
            <div className="metric-card">
              <div className="metric-label">Total Trades</div>
              <div className="metric-value">{entries.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total P&L</div>
              <div className={`metric-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Win Rate</div>
              <div className={`metric-value ${parseFloat(winRate) >= 50 ? 'positive' : 'negative'}`}>
                {winRate}%
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Winning Trades</div>
              <div className="metric-value positive">{winningTrades}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Losing Trades</div>
              <div className="metric-value negative">{losingTrades}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Account Growth</div>
              <div className={`metric-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {((totalPnL / budget) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>📈 Recent Performance</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
              Your trading journey is being tracked. Add more trades to see detailed analytics and charts.
            </p>
          </div>
        </div>

        {/* Add Trade Tab */}
        <div className={`tab-content ${activeTab === 'add' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>➕ Add New Trade</h3>
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
                  <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
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
                <div className="form-group">
                  <label>Stop Loss</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.stop_loss}
                    onChange={(e) => setForm({ ...form, stop_loss: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Take Profit</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.take_profit}
                    onChange={(e) => setForm({ ...form, take_profit: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Strategy</label>
                  <select value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })}>
                    <option value="">Select Strategy</option>
                    <option value="breakout">Breakout</option>
                    <option value="reversal">Reversal</option>
                    <option value="trend">Trend Following</option>
                    <option value="scalping">Scalping</option>
                    <option value="swing">Swing Trading</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Notes / Analysis</label>
                <textarea
                  placeholder="Trade rationale, market conditions, lessons learned..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : '💾 Save Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* History Tab */}
        <div className={`tab-content ${activeTab === 'history' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>📋 Trade History</h3>
            {entries.length === 0 ? (
              <div className="empty-state">
                <h3>No trades logged yet</h3>
                <p>Start tracking your trades to improve your performance!</p>
                <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveTab('add')}>
                  Add Your First Trade
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Qty</th>
                      <th>P&L</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const pnl = calculatePnL(entry);
                      const isOpen = !entry.exit_price;
                      return (
                        <tr key={entry.id}>
                          <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 600 }}>{entry.symbol}</td>
                          <td>
                            <span className={`status-badge ${entry.side === 'buy' ? 'status-closed' : 'status-open'}`}>
                              {entry.side.toUpperCase()}
                            </span>
                          </td>
                          <td>${entry.entry_price || '-'}</td>
                          <td>${entry.exit_price || '-'}</td>
                          <td>{entry.quantity || '-'}</td>
                          <td className={pnl && parseFloat(pnl) >= 0 ? 'positive' : 'negative'}>
                            {pnl ? `${parseFloat(pnl) >= 0 ? '+' : ''}$${pnl}` : '-'}
                          </td>
                          <td>
                            <span className={`status-badge ${isOpen ? 'status-open' : 'status-closed'}`}>
                              {isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Calculator Tab */}
        <div className={`tab-content ${activeTab === 'calculator' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>🧮 Position Size Calculator</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
              Calculate the optimal position size based on your risk management rules.
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label>Account Size ($)</label>
                <input
                  type="number"
                  placeholder="10000"
                  value={calcRisk.accountSize}
                  onChange={(e) => setCalcRisk({ ...calcRisk, accountSize: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="1"
                  value={calcRisk.riskPercent}
                  onChange={(e) => setCalcRisk({ ...calcRisk, riskPercent: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Entry Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={calcRisk.entryPrice}
                  onChange={(e) => setCalcRisk({ ...calcRisk, entryPrice: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Stop Loss ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="95.00"
                  value={calcRisk.stopLoss}
                  onChange={(e) => setCalcRisk({ ...calcRisk, stopLoss: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-success" style={{ marginTop: '20px' }} onClick={calculatePositionSize}>
              Calculate Position Size
            </button>

            {calcResult && (
              <div className="calc-results">
                <div className="calc-result-item">
                  <div className="calc-result-label">Risk Amount</div>
                  <div className="calc-result-value">${calcResult.riskAmount}</div>
                </div>
                <div className="calc-result-item">
                  <div className="calc-result-label">Position Size</div>
                  <div className="calc-result-value">{calcResult.shares} shares</div>
                </div>
                <div className="calc-result-item">
                  <div className="calc-result-label">Position Value</div>
                  <div className="calc-result-value">${calcResult.positionValue}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Psychology Tab */}
        <div className={`tab-content ${activeTab === 'psychology' ? 'active' : ''}`}>
          <div className="psychology-grid">
            <div className="psychology-card">
              <h4>😊 Pre-Trade Emotions</h4>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>
                Track your emotional state before entering trades.
              </p>
              <div>
                <span className="emotion-tag">Confident</span>
                <span className="emotion-tag">Calm</span>
                <span className="emotion-tag">Anxious</span>
                <span className="emotion-tag">Fearful</span>
                <span className="emotion-tag">Greedy</span>
                <span className="emotion-tag">FOMO</span>
                <span className="emotion-tag">Revenge</span>
                <span className="emotion-tag">Excited</span>
              </div>
            </div>
            <div className="psychology-card">
              <h4>📝 Trading Rules</h4>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>
                Your personal trading rules to follow:
              </p>
              <ul style={{ color: 'rgba(255,255,255,0.8)', paddingLeft: '20px' }}>
                <li>Never risk more than 1-2% per trade</li>
                <li>Always use stop losses</li>
                <li>Don't trade on emotions</li>
                <li>Review trades weekly</li>
                <li>Take breaks after losses</li>
              </ul>
            </div>
            <div className="psychology-card">
              <h4>💡 Trading Tips</h4>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>
                Remember these key principles:
              </p>
              <ul style={{ color: 'rgba(255,255,255,0.8)', paddingLeft: '20px' }}>
                <li>Plan your trade, trade your plan</li>
                <li>Cut losses quickly</li>
                <li>Let winners run</li>
                <li>Keep a trading journal</li>
                <li>Learn from every trade</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Modal */}
      <div className={`modal ${showBudgetModal ? 'active' : ''}`}>
        <div className="modal-content">
          <h2>Edit Trading Capital</h2>
          <div className="form-group">
            <label>Trading Capital ($)</label>
            <input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={() => {
              setBudget(parseFloat(newBudget) || 10000);
              setShowBudgetModal(false);
            }}>
              Save
            </button>
            <button className="btn btn-secondary" onClick={() => setShowBudgetModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>Market Warrior Trading Journal | Professional Edition</p>
        <p style={{ marginTop: '5px' }}>Track your trades. Improve your performance. Master the markets.</p>
      </footer>
    </>
  );
}
