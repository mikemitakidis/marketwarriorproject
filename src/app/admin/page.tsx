'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string
  has_paid: boolean
  is_admin: boolean
  current_day: number
  completed_days: number[]
  created_at: string
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState({ totalUsers: 0, paidUsers: 0, revenue: 0, completions: 0 })
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!user?.is_admin) {
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    loadStats()
    loadUsers()
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      if (!data.error) {
        setStats(data)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const toggleUserPaid = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { has_paid: !currentStatus }
        })
      })
      const data = await response.json()
      if (data.success) {
        loadUsers()
        loadStats()
      }
    } catch (err) {
      alert('Error updating user')
    }
  }

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
  }

  if (!isAdmin) return null

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #f1f5f9; color: #1e293b; }
        .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 260px; background: linear-gradient(180deg, #1e293b 0%, #334155 100%); padding: 30px 0; overflow-y: auto; z-index: 100; }
        .logo-section { text-align: center; padding: 0 20px 30px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .logo-section h2 { color: white; font-size: 1.5em; margin-top: 15px; }
        .logo-icon { font-size: 50px; }
        .nav-menu { padding: 30px 0; }
        .nav-item { padding: 15px 30px; color: #cbd5e1; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 15px; font-size: 0.95em; }
        .nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
        .nav-item.active { background: #667eea; color: white; border-left: 4px solid #fbbf24; }
        .nav-icon { font-size: 1.3em; width: 25px; text-align: center; }
        .main-content { margin-left: 260px; padding: 30px; min-height: 100vh; }
        .top-bar { background: white; padding: 20px 30px; border-radius: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .page-title { font-size: 2em; color: #1e293b; }
        .content-section { display: none; }
        .content-section.active { display: block; }
        .card { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 30px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9; }
        .card-title { font-size: 1.5em; color: #1e293b; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .stat-title { font-size: 0.9em; color: #64748b; font-weight: 600; }
        .stat-icon { font-size: 1.8em; }
        .stat-value { font-size: 2.2em; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .stat-change { font-size: 0.85em; font-weight: 600; color: #10b981; }
        .btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 0.9em; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5568d3; }
        .btn-success { background: #10b981; color: white; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-sm { padding: 6px 12px; font-size: 0.8em; }
        .search-input { padding: 12px 20px; border: 2px solid #e2e8f0; border-radius: 10px; width: 300px; font-size: 1em; }
        .search-input:focus { outline: none; border-color: #667eea; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        .data-table td { padding: 15px; border-bottom: 1px solid #e2e8f0; }
        .data-table tr:hover { background: #f8fafc; }
        .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75em; font-weight: 600; }
        .badge-success { background: #d1fae5; color: #059669; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        @media (max-width: 1024px) { .sidebar { width: 80px; } .sidebar .logo-section h2, .sidebar .nav-item span:not(.nav-icon) { display: none; } .main-content { margin-left: 80px; } }
        @media (max-width: 768px) { .sidebar { display: none; } .main-content { margin-left: 0; } .search-input { width: 100%; } }
      `}</style>

      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">⚔️</div>
          <h2>Admin Panel</h2>
        </div>
        <nav className="nav-menu">
          <div className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>
            <span className="nav-icon">👥</span>
            <span>Users</span>
          </div>
          <div className="nav-item" onClick={() => router.push('/dashboard')}>
            <span className="nav-icon">←</span>
            <span>Back to App</span>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <h1 className="page-title">
            {activeSection === 'dashboard' && '📊 Dashboard'}
            {activeSection === 'users' && '👥 User Management'}
          </h1>
          <button className="btn btn-primary" onClick={() => { loadStats(); loadUsers(); }}>🔄 Refresh</button>
        </div>

        <div className={`content-section ${activeSection === 'dashboard' ? 'active' : ''}`}>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Total Users</span>
                <span className="stat-icon">👥</span>
              </div>
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-change">All registered</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Paid Users</span>
                <span className="stat-icon">💳</span>
              </div>
              <div className="stat-value">{stats.paidUsers}</div>
              <div className="stat-change">Active subscribers</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Revenue</span>
                <span className="stat-icon">💰</span>
              </div>
              <div className="stat-value">${stats.revenue.toFixed(2)}</div>
              <div className="stat-change">Total earnings</div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Completions</span>
                <span className="stat-icon">🎓</span>
              </div>
              <div className="stat-value">{stats.completions}</div>
              <div className="stat-change">Course completions</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setActiveSection('users')}>Manage Users</button>
              <a href="/dashboard" className="btn btn-success" style={{ textDecoration: 'none' }}>View Dashboard</a>
            </div>
          </div>
        </div>

        <div className={`content-section ${activeSection === 'users' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">All Users ({filteredUsers.length})</h2>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.full_name || '-'}</td>
                      <td>
                        <span className={`badge ${user.has_paid ? 'badge-success' : 'badge-warning'}`}>
                          {user.has_paid ? 'Paid' : 'Free'}
                        </span>
                        {user.is_admin && <span className="badge badge-danger" style={{ marginLeft: '5px' }}>Admin</span>}
                      </td>
                      <td>{user.completed_days?.length || 0}/30 days</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className={`btn btn-sm ${user.has_paid ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleUserPaid(user.id, user.has_paid)}
                        >
                          {user.has_paid ? 'Revoke' : 'Grant'} Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
