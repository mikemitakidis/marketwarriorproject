'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Trade {
  id: string
  date: string
  symbol: string
  trade_type: 'long' | 'short'
  entry_price: number
  exit_price: number
  quantity: number
  pnl: number
  notes: string
}

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [newTrade, setNewTrade] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    trade_type: 'long' as 'long' | 'short',
    entry_price: '',
    exit_price: '',
    quantity: '',
    notes: ''
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    loadTrades()
  }

  const loadTrades = async () => {
    try {
      const response = await fetch('/api/journal')
      const data = await response.json()
      if (data.entries) {
        setTrades(data.entries)
      }
    } catch (err) {
      console.error('Error loading trades:', err)
    }
    setLoading(false)
  }

  const addTrade = async () => {
    if (!newTrade.symbol || !newTrade.entry_price || !newTrade.exit_price || !newTrade.quantity) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newTrade.date,
          symbol: newTrade.symbol,
          trade_type: newTrade.trade_type,
          entry_price: parseFloat(newTrade.entry_price),
          exit_price: parseFloat(newTrade.exit_price),
          quantity: parseFloat(newTrade.quantity),
          notes: newTrade.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        setTrades([data.entry, ...trades])
        setNewTrade({
          date: new Date().toISOString().split('T')[0],
          symbol: '',
          trade_type: 'long',
          entry_price: '',
          exit_price: '',
          quantity: '',
          notes: ''
        })
        setActiveTab('history')
        alert('Trade added successfully!')
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Error adding trade')
    }

    setSubmitting(false)
  }

  const deleteTrade = async (id: string) => {
    if (!confirm('Delete this trade?')) return

    try {
      const response = await fetch(`/api/journal?id=${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (data.success) {
        setTrades(trades.filter(t => t.id !== id))
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err) {
      alert('Error deleting trade')
    }
  }

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const winningTrades = trades.filter(t => t.pnl > 0).length
  const losingTrades = trades.filter(t => t.pnl < 0).length
  const winRate = trades.length > 0 ? Math.round((winningTrades / trades.length) * 100) : 0
  const avgWin = winningTrades > 0 ? trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades : 0
  const avgLoss = losingTrades > 0 ? Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / losingTrades) : 0

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2em' }}>Loading Journal...</div>
  }

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%); color: #e0e0e0; min-height: 100vh; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .logo { display: flex; align-items: center; gap: 15px; }
        .logo-icon { width: 50px; height: 50px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .logo-text h1 { font-size: 24px; color: white; margin-bottom: 2px; }
        .logo-text p { font-size: 12px; color: rgba(255,255,255,0.8); }
        .back-btn { background: rgba(255,255,255,0.3); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; text-decoration: none; }
        .back-btn:hover { background: rgba(255,255,255,0.4); }
        .nav-tabs { background: rgba(30, 30, 46, 0.95); padding: 0 40px; display: flex; gap: 5px; max-width: 1400px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .tab-btn { padding: 15px 25px; background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; font-weight: 600; border-bottom: 3px solid transparent; }
        .tab-btn:hover { color: white; }
        .tab-btn.active { color: #667eea; border-bottom-color: #667eea; background: rgba(102, 126, 234, 0.1); }
        .container { max-width: 1400px; margin: 0 auto; padding: 30px 40px; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 25px; text-align: center; }
        .metric-card:hover { background: rgba(255,255,255,0.08); transform: translateY(-3px); }
        .metric-label { font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 10px; }
        .metric-value { font-size: 28px; font-weight: bold; color: white; }
        .metric-value.positive { color: #4ade80; }
        .metric-value.negative { color: #f87171; }
        .form-section { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 25px; margin-bottom: 30px; }
        .form-section h3 { margin-bottom: 20px; color: #667eea; font-size: 18px; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
        .form-group input, .form-group select, .form-group textarea { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 12px 15px; color: white; font-size: 14px; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
        .form-group select option { background: #2d2d44; color: white; }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .btn { padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s; }
        .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .trade-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .trade-table th, .trade-table td { padding: 15px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .trade-table th { background: rgba(255,255,255,0.05); color: #667eea; font-weight: 600; }
        .trade-table tr:hover { background: rgba(255,255,255,0.03); }
        .pnl-positive { color: #4ade80; font-weight: 600; }
        .pnl-negative { color: #f87171; font-weight: 600; }
        .delete-btn { background: rgba(239, 68, 68, 0.2); color: #f87171; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; }
        .delete-btn:hover { background: rgba(239, 68, 68, 0.3); }
        .empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.5); }
        @media (max-width: 768px) { .header { padding: 15px 20px; } .container { padding: 20px; } .nav-tabs { padding: 0 20px; overflow-x: auto; } .trade-table { font-size: 12px; } .trade-table th, .trade-table td { padding: 10px; } }
      `}</style>

      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📊</div>
            <div className="logo-text">
              <h1>Trading Journal</h1>
              <p>Track &amp; Analyze Your Trades</p>
            </div>
          </div>
          <a href="/dashboard" className="back-btn">← Dashboard</a>
        </div>
      </header>

      <nav className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
        <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>➕ Add Trade</button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📜 History</button>
      </nav>

      <div className="container">
        <div className={`tab-content ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <div className="dashboard-grid">
            <div className="metric-card">
              <div className="metric-label">Total P&amp;L</div>
              <div className={`metric-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Win Rate</div>
              <div className="metric-value">{winRate}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Trades</div>
              <div className="metric-value">{trades.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Winning</div>
              <div className="metric-value positive">{winningTrades}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Losing</div>
              <div className="metric-value negative">{losingTrades}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg Win</div>
              <div className="metric-value positive">+${avgWin.toFixed(2)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg Loss</div>
              <div className="metric-value negative">-${avgLoss.toFixed(2)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Profit Factor</div>
              <div className="metric-value">{avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '∞'}</div>
            </div>
          </div>
        </div>

        <div className={`tab-content ${activeTab === 'add' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>➕ Log New Trade</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={newTrade.date} onChange={(e) => setNewTrade({...newTrade, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Symbol *</label>
                <input type="text" placeholder="e.g. AAPL" value={newTrade.symbol} onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Position Type *</label>
                <select value={newTrade.trade_type} onChange={(e) => setNewTrade({...newTrade, trade_type: e.target.value as 'long' | 'short'})}>
                  <option value="long">Long (Buy)</option>
                  <option value="short">Short (Sell)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Entry Price *</label>
                <input type="number" step="0.01" placeholder="0.00" value={newTrade.entry_price} onChange={(e) => setNewTrade({...newTrade, entry_price: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Exit Price *</label>
                <input type="number" step="0.01" placeholder="0.00" value={newTrade.exit_price} onChange={(e) => setNewTrade({...newTrade, exit_price: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input type="number" placeholder="0" value={newTrade.quantity} onChange={(e) => setNewTrade({...newTrade, quantity: e.target.value})} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Notes (Optional)</label>
              <textarea placeholder="Trade notes, analysis, lessons learned..." value={newTrade.notes} onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})} />
            </div>
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={addTrade} disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Trade'}
            </button>
          </div>
        </div>

        <div className={`tab-content ${activeTab === 'history' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>📜 Trade History</h3>
            {trades.length === 0 ? (
              <div className="empty-state">
                <p>No trades logged yet.</p>
                <p style={{ marginTop: '10px' }}>Start by adding your first trade!</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="trade-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th>Type</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Qty</th>
                      <th>P&amp;L</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(trade => (
                      <tr key={trade.id}>
                        <td>{trade.date}</td>
                        <td>{trade.symbol}</td>
                        <td>{trade.trade_type.toUpperCase()}</td>
                        <td>${trade.entry_price.toFixed(2)}</td>
                        <td>${trade.exit_price.toFixed(2)}</td>
                        <td>{trade.quantity}</td>
                        <td className={trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </td>
                        <td>
                          <button className="delete-btn" onClick={() => deleteTrade(trade.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
