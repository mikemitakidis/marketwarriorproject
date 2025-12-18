'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { JournalEntry } from '@/lib/types'

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [positionSize, setPositionSize] = useState('')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState<'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN'>('OPEN')

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setEntries(data as JournalEntry[])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setTradeDate(new Date().toISOString().split('T')[0])
    setSymbol('')
    setDirection('LONG')
    setEntryPrice('')
    setExitPrice('')
    setStopLoss('')
    setTakeProfit('')
    setPositionSize('')
    setNotes('')
    setOutcome('OPEN')
    setEditingId(null)
  }

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id)
    setTradeDate(entry.trade_date)
    setSymbol(entry.symbol)
    setDirection(entry.direction)
    setEntryPrice(entry.entry_price.toString())
    setExitPrice(entry.exit_price?.toString() || '')
    setStopLoss(entry.stop_loss?.toString() || '')
    setTakeProfit(entry.take_profit?.toString() || '')
    setPositionSize(entry.position_size.toString())
    setNotes(entry.notes || '')
    setOutcome(entry.outcome || 'OPEN')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    
    const supabase = createClient()
    await supabase.from('journal_entries').delete().eq('id', id)
    loadEntries()
  }

  const calculatePnL = () => {
    if (!entryPrice || !exitPrice || !positionSize) return null
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const size = parseFloat(positionSize)
    
    if (direction === 'LONG') {
      return ((exit - entry) * size).toFixed(2)
    } else {
      return ((entry - exit) * size).toFixed(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      return
    }

    const pnl = calculatePnL()

    const entryData = {
      user_id: user.id,
      trade_date: tradeDate,
      symbol: symbol.toUpperCase(),
      direction,
      entry_price: parseFloat(entryPrice),
      exit_price: exitPrice ? parseFloat(exitPrice) : null,
      stop_loss: stopLoss ? parseFloat(stopLoss) : null,
      take_profit: takeProfit ? parseFloat(takeProfit) : null,
      position_size: parseFloat(positionSize),
      notes: notes || null,
      outcome: outcome,
      pnl: pnl ? parseFloat(pnl) : null
    }

    if (editingId) {
      await supabase
        .from('journal_entries')
        .update(entryData)
        .eq('id', editingId)
    } else {
      await supabase
        .from('journal_entries')
        .insert(entryData)
    }

    resetForm()
    setShowForm(false)
    setSaving(false)
    loadEntries()
  }

  // Calculate stats
  const totalTrades = entries.length
  const wins = entries.filter(e => e.outcome === 'WIN').length
  const losses = entries.filter(e => e.outcome === 'LOSS').length
  const winRate = totalTrades > 0 ? Math.round((wins / (wins + losses)) * 100) || 0 : 0
  const totalPnL = entries.reduce((sum, e) => sum + (e.pnl || 0), 0)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-emerald-500">Trading Journal</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total Trades</p>
            <p className="text-2xl font-bold">{totalTrades}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Win Rate</p>
            <p className="text-2xl font-bold text-emerald-500">{winRate}%</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Wins / Losses</p>
            <p className="text-2xl font-bold">
              <span className="text-emerald-500">{wins}</span>
              <span className="text-gray-500"> / </span>
              <span className="text-red-500">{losses}</span>
            </p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total P&L</p>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ${totalPnL.toFixed(2)}
            </p>
          </div>
        </div>

        {/* New Entry Button */}
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="btn-primary mb-6"
        >
          {showForm ? 'Cancel' : '+ New Trade Entry'}
        </button>

        {/* Entry Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Trade Date</label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="input"
                placeholder="AAPL, BTC, EUR/USD..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'LONG' | 'SHORT')}
                className="input"
              >
                <option value="LONG">Long</option>
                <option value="SHORT">Short</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Position Size</label>
              <input
                type="number"
                step="0.01"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                className="input"
                placeholder="100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entry Price</label>
              <input
                type="number"
                step="0.00001"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="input"
                placeholder="150.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Exit Price</label>
              <input
                type="number"
                step="0.00001"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="input"
                placeholder="155.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss</label>
              <input
                type="number"
                step="0.00001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="input"
                placeholder="145.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit</label>
              <input
                type="number"
                step="0.00001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="input"
                placeholder="160.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Outcome</label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as any)}
                className="input"
              >
                <option value="OPEN">Open</option>
                <option value="WIN">Win</option>
                <option value="LOSS">Loss</option>
                <option value="BREAKEVEN">Breakeven</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">P&L (calculated)</label>
              <div className="input bg-gray-900">
                {calculatePnL() ? `$${calculatePnL()}` : '-'}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Trade notes, lessons learned..."
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </form>
        )}

        {/* Entries Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No trades recorded yet. Start tracking your trades!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Symbol</th>
                  <th className="text-left py-3 px-2">Direction</th>
                  <th className="text-right py-3 px-2">Entry</th>
                  <th className="text-right py-3 px-2">Exit</th>
                  <th className="text-right py-3 px-2">Size</th>
                  <th className="text-right py-3 px-2">P&L</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-center py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 px-2">{entry.trade_date}</td>
                    <td className="py-3 px-2 font-medium">{entry.symbol}</td>
                    <td className="py-3 px-2">
                      <span className={entry.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>
                        {entry.direction}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">${entry.entry_price}</td>
                    <td className="py-3 px-2 text-right">{entry.exit_price ? `$${entry.exit_price}` : '-'}</td>
                    <td className="py-3 px-2 text-right">{entry.position_size}</td>
                    <td className={`py-3 px-2 text-right font-medium ${
                      entry.pnl && entry.pnl > 0 ? 'text-emerald-400' : entry.pnl && entry.pnl < 0 ? 'text-red-400' : ''
                    }`}>
                      {entry.pnl ? `$${entry.pnl.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        entry.outcome === 'WIN' ? 'bg-emerald-900/50 text-emerald-400' :
                        entry.outcome === 'LOSS' ? 'bg-red-900/50 text-red-400' :
                        entry.outcome === 'BREAKEVEN' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {entry.outcome || 'OPEN'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-gray-400 hover:text-white mr-2"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
