import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getUserFromRequest, getServiceSupabase } from '../lib/serverAuth';

/**
 * Admin Dashboard - Fully functional React component
 *
 * Features:
 * - User management (view all users)
 * - Stripe price configuration
 * - App settings management
 * - Forum moderation link
 */
export async function getServerSideProps({ req }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return { props: { accessDenied: true } };
    }

    // Fetch all users
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, has_paid, is_admin, created_at')
      .order('created_at', { ascending: false });

    // Fetch app settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value');

    // Get some stats
    const totalUsers = users?.length || 0;
    const paidUsers = users?.filter(u => u.has_paid)?.length || 0;

    return {
      props: {
        accessDenied: false,
        adminName: profile.full_name || 'Admin',
        users: users || [],
        settings: settings || [],
        stats: { totalUsers, paidUsers },
      },
    };
  } catch (err) {
    console.error('Admin page error:', err);
    return { props: { accessDenied: true } };
  }
}

export default function AdminPage({ accessDenied, adminName, users, settings, stats }) {
  const [priceId, setPriceId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  if (accessDenied) {
    return (
      <>
        <Head><title>Access Denied - Market Warrior Admin</title></Head>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; min-height: 100vh; }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>Access Denied</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>You do not have permission to access the admin panel.</p>
          <Link href="/dashboard" style={{ color: '#667eea' }}>Return to Dashboard</Link>
        </div>
      </>
    );
  }

  const handleUpdatePrice = async () => {
    if (!priceId.startsWith('price_')) {
      setMessage({ type: 'error', text: 'Price ID must start with price_' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/settings/stripe-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Price ID updated successfully!' });
        setPriceId('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update price' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const currentPriceId = settings?.find(s => s.key === 'stripe_price_id')?.value || 'Not set';

  return (
    <>
      <Head>
        <title>Admin Dashboard - Market Warrior</title>
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
        .logo { font-size: 1.25rem; font-weight: 700; color: #ef4444; text-decoration: none; }
        .user-info { display: flex; align-items: center; gap: 16px; }
        .user-info span { color: #94a3b8; }
        .back-link { color: #667eea; text-decoration: none; }
        .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .page-title { font-size: 2rem; margin-bottom: 24px; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-value { font-size: 2.5rem; font-weight: 700; color: #667eea; }
        .stat-label { color: #94a3b8; margin-top: 8px; }
        .section {
          background: #1e293b;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .section h2 { font-size: 1.5rem; margin-bottom: 16px; color: #667eea; }
        .section h3 { font-size: 1.1rem; margin-bottom: 12px; color: #94a3b8; }
        .input-group { display: flex; gap: 12px; margin-bottom: 16px; }
        .input-group input {
          flex: 1;
          padding: 12px;
          border: 2px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: white;
          font-size: 1rem;
        }
        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        .btn-primary:hover { transform: translateY(-2px); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .message { padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        .message.success { background: #166534; color: #bbf7d0; }
        .message.error { background: #991b1b; color: #fecaca; }
        .current-value { color: #64748b; font-size: 0.9rem; margin-bottom: 12px; }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #334155;
        }
        .users-table th { color: #94a3b8; font-weight: 600; }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-admin { background: #ef4444; color: white; }
        .badge-paid { background: #22c55e; color: white; }
        .badge-unpaid { background: #64748b; color: white; }
        .quick-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .quick-link {
          background: #0f172a;
          padding: 20px;
          border-radius: 12px;
          text-decoration: none;
          color: white;
          border: 1px solid #334155;
          transition: all 0.2s;
          text-align: center;
        }
        .quick-link:hover { border-color: #667eea; transform: translateY(-2px); }
        .quick-link-icon { font-size: 2rem; margin-bottom: 12px; }
        .quick-link-title { font-weight: 600; }
      `}</style>

      <header className="header">
        <span className="logo">Admin Panel</span>
        <div className="user-info">
          <span>Welcome, {adminName}</span>
          <Link href="/dashboard" className="back-link">Back to Dashboard</Link>
        </div>
      </header>

      <div className="container">
        <h1 className="page-title">Admin Dashboard</h1>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats?.totalUsers || 0}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.paidUsers || 0}</div>
            <div className="stat-label">Paid Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.totalUsers ? Math.round((stats.paidUsers / stats.totalUsers) * 100) : 0}%</div>
            <div className="stat-label">Conversion Rate</div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="quick-links">
            <Link href="/admin/forum" className="quick-link">
              <div className="quick-link-icon">💬</div>
              <div className="quick-link-title">Forum Moderation</div>
            </Link>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="quick-link">
              <div className="quick-link-icon">💳</div>
              <div className="quick-link-title">Stripe Dashboard</div>
            </a>
          </div>
        </div>

        {/* Billing Settings */}
        <div className="section">
          <h2>Billing Settings</h2>
          <h3>Stripe Price ID</h3>
          <p className="current-value">Current: {currentPriceId}</p>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

          <div className="input-group">
            <input
              type="text"
              placeholder="price_..."
              value={priceId}
              onChange={(e) => setPriceId(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={handleUpdatePrice}
              disabled={loading || !priceId}
            >
              {loading ? 'Updating...' : 'Update Price'}
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="section">
          <h2>Users ({users?.length || 0})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email || 'N/A'}</td>
                    <td>{u.full_name || 'Not set'}</td>
                    <td>
                      {u.is_admin && <span className="badge badge-admin">Admin</span>}
                      {' '}
                      {u.has_paid ? (
                        <span className="badge badge-paid">Paid</span>
                      ) : (
                        <span className="badge badge-unpaid">Unpaid</span>
                      )}
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!users || users.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
