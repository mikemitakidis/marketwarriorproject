'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalUsers: number
  paidUsers: number
  totalRevenue: number
  completionRate: number
}

interface User {
  id: string
  email: string
  full_name: string | null
  has_paid: boolean
  is_admin: boolean
  created_at: string
  challenge_start_date: string | null
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      window.location.href = '/dashboard'
      return
    }

    // Get all users
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersData) {
      setUsers(usersData)

      // Calculate stats
      const totalUsers = usersData.length
      const paidUsers = usersData.filter(u => u.has_paid).length
      const totalRevenue = paidUsers * 39.99

      // Get completion data
      const { data: completions } = await supabase
        .from('user_progress')
        .select('user_id')
        .eq('day_number', 30)
        .eq('quiz_passed', true)

      const completedUsers = new Set(completions?.map(c => c.user_id)).size
      const completionRate = paidUsers > 0 ? Math.round((completedUsers / paidUsers) * 100) : 0

      setStats({
        totalUsers,
        paidUsers,
        totalRevenue,
        completionRate
      })
    }

    setLoading(false)
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const supabase = createClient()
    
    await supabase
      .from('users')
      .update({ is_admin: !currentStatus })
      .eq('id', userId)

    loadData()
  }

  const togglePaid = async (userId: string, currentStatus: boolean) => {
    const supabase = createClient()
    
    await supabase
      .from('users')
      .update({ has_paid: !currentStatus })
      .eq('id', userId)

    loadData()
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    if (filter === 'paid') return matchesSearch && user.has_paid
    if (filter === 'unpaid') return matchesSearch && !user.has_paid
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-emerald-500">Admin Panel</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total Users</p>
            <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Paid Users</p>
            <p className="text-3xl font-bold text-emerald-500">{stats?.paidUsers || 0}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">${stats?.totalRevenue.toFixed(2) || '0.00'}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Completion Rate</p>
            <p className="text-3xl font-bold">{stats?.completionRate || 0}%</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input flex-1"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-emerald-600' : 'bg-gray-800'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-4 py-2 rounded-lg ${filter === 'paid' ? 'bg-emerald-600' : 'bg-gray-800'}`}
            >
              Paid
            </button>
            <button
              onClick={() => setFilter('unpaid')}
              className={`px-4 py-2 rounded-lg ${filter === 'unpaid' ? 'bg-emerald-600' : 'bg-gray-800'}`}
            >
              Unpaid
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-2">Email</th>
                <th className="text-left py-3 px-2">Name</th>
                <th className="text-center py-3 px-2">Paid</th>
                <th className="text-center py-3 px-2">Admin</th>
                <th className="text-left py-3 px-2">Joined</th>
                <th className="text-center py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-3 px-2">{user.email}</td>
                  <td className="py-3 px-2">{user.full_name || '-'}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.has_paid ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {user.has_paid ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_admin ? 'bg-purple-900/50 text-purple-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {user.is_admin ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-2">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => togglePaid(user.id, user.has_paid)}
                      className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded mr-2"
                    >
                      Toggle Paid
                    </button>
                    <button
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                      className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded"
                    >
                      Toggle Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found matching your criteria.
          </div>
        )}
      </main>
    </div>
  )
}
