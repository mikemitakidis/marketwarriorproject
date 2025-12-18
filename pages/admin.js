import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getUserFromRequest, getServiceSupabase } from '../lib/serverAuth';

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
      .select('is_admin, full_name, email')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return { props: { accessDenied: true } };
    }

    // Fetch all users
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, has_paid, is_admin, created_at, terms_accepted_at, affiliate_code')
      .order('created_at', { ascending: false });

    // Fetch app settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value');

    // Fetch forum threads for community
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Get stats
    const totalUsers = users?.length || 0;
    const paidUsers = users?.filter(u => u.has_paid)?.length || 0;

    return {
      props: {
        accessDenied: false,
        adminName: profile.full_name || 'Admin',
        adminEmail: profile.email || 'admin@marketwarrior.club',
        users: users || [],
        settings: settings || [],
        threads: threads || [],
        stats: { totalUsers, paidUsers },
      },
    };
  } catch (err) {
    console.error('Admin page error:', err);
    return { props: { accessDenied: true } };
  }
}

export default function AdminPage({ accessDenied, adminName, adminEmail, users, settings, threads, stats }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedDay, setSelectedDay] = useState('');
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [challengePrice, setChallengePrice] = useState('39.99');
  const [logoUrl, setLogoUrl] = useState('');
  const [siteName, setSiteName] = useState('Market Warrior Challenge');
  const [supportEmail, setSupportEmail] = useState('support@marketwarrior.club');
  const [accessDuration, setAccessDuration] = useState('120');
  const [maxDevices, setMaxDevices] = useState('2');

  const currentPriceId = settings?.find(s => s.key === 'stripe_price_id')?.value || 'Not set';

  if (accessDenied) {
    return (
      <>
        <Head><title>Access Denied - Market Warrior Admin</title></Head>
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; min-height: 100vh; }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '16px', color: '#1e293b' }}>Access Denied</h1>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>You do not have permission to access the admin panel.</p>
          <Link href="/dashboard" style={{ color: '#667eea' }}>Return to Dashboard</Link>
        </div>
      </>
    );
  }

  const showSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const pageTitles = {
    dashboard: 'Dashboard',
    settings: 'Site Settings',
    content: 'Content Editor',
    users: 'User Management',
    promo: 'Promo Codes',
    affiliates: 'Affiliate Program',
    analytics: 'Analytics',
    emails: 'Email Campaigns',
    community: 'Community Management',
    livefeed: 'Live Feed',
    certificates: 'Certificates',
  };

  const dayTitles = [
    'Day 1: What is Trading & Types of Markets',
    'Day 2: Setting Up Demo Account',
    'Day 3: Essential Trading Terms',
    'Day 4: Investment vs Trading',
    'Day 5: Understanding Indexes',
    'Day 6: Stop Loss, Take Profit & Leverage',
    'Day 7: Basic Charting Techniques',
    'Day 8: Trends & Price Action',
    'Day 9: Support & Resistance Levels',
    'Day 10: Chart Patterns Recognition',
    'Day 11: RSI, MACD & Moving Averages',
    'Day 12: Introduction to Fundamental Analysis',
    'Day 13: Stock Research & Financial Ratios',
    'Day 14: Simulated Trading Exercise',
    'Day 15: Risk Management & Position Sizing',
    'Day 16: Moving Averages & Crossovers',
    'Day 17: Fibonacci Retracements',
    'Day 18: Backtesting Trading Strategies',
    'Day 19: Creating Your Trading Plan',
    'Day 20: Trading Psychology Mastery',
    'Day 21: Dividends, Bonds & Fixed Income',
    'Day 22: IPOs, Penny Stocks & Crypto',
    'Day 23: Hedge Funds & Copy Trading',
    'Day 24: Portfolio Rebalancing Strategies',
    'Day 25: Monitoring Performance Metrics',
    'Day 26: Adjusting Your Strategy',
    'Day 27: Trade Journaling & Performance',
    'Day 28: Global Economic Indicators',
    'Day 29: SMART Goals & Review',
    'Day 30: Final Assessment & Graduation',
  ];

  return (
    <>
      <Head>
        <title>Market Warrior - Admin Panel</title>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: #f1f5f9;
          color: #1e293b;
        }
      `}</style>

      <style jsx>{`
        /* Sidebar */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 260px;
          background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
          padding: 30px 0;
          overflow-y: auto;
          z-index: 100;
        }

        .logo-section {
          text-align: center;
          padding: 0 20px 30px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo-section h2 {
          color: white;
          font-size: 1.5em;
          margin-top: 15px;
        }

        .logo-icon {
          font-size: 50px;
        }

        .nav-menu {
          padding: 30px 0;
        }

        .nav-item {
          padding: 15px 30px;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 0.95em;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .nav-item.active {
          background: #667eea;
          color: white;
          border-left: 4px solid #fbbf24;
        }

        .nav-icon {
          font-size: 1.3em;
          width: 25px;
          text-align: center;
        }

        /* Main Content */
        .main-content {
          margin-left: 260px;
          padding: 30px;
          min-height: 100vh;
        }

        .top-bar {
          background: white;
          padding: 20px 30px;
          border-radius: 15px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .page-title {
          font-size: 2em;
          color: #1e293b;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .user-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: #667eea;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
        }

        /* Content Sections */
        .content-section {
          display: none;
        }

        .content-section.active {
          display: block;
        }

        .card {
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          margin-bottom: 30px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f1f5f9;
        }

        .card-title {
          font-size: 1.5em;
          color: #1e293b;
        }

        /* Form Elements */
        .form-group {
          margin-bottom: 25px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #475569;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 12px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1em;
          font-family: inherit;
        }

        .form-group textarea {
          min-height: 120px;
          resize: vertical;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
        }

        /* Buttons */
        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.95em;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
          transform: translateY(-2px);
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
        }

        .btn-warning {
          background: #f59e0b;
          color: white;
        }

        .btn-warning:hover {
          background: #d97706;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 0.85em;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .stat-title {
          font-size: 0.9em;
          color: #64748b;
          font-weight: 600;
        }

        .stat-icon {
          font-size: 1.8em;
        }

        .stat-value {
          font-size: 2.2em;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .stat-change {
          font-size: 0.85em;
          font-weight: 600;
        }

        .stat-change.positive {
          color: #10b981;
        }

        .stat-change.negative {
          color: #ef4444;
        }

        /* Tables */
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f8fafc;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }

        .data-table td {
          padding: 15px;
          border-bottom: 1px solid #f1f5f9;
        }

        .data-table tr:hover {
          background: #f8fafc;
        }

        .badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: 600;
        }

        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Price Editor */
        .price-editor {
          background: linear-gradient(135deg, #667eea, #764ba2);
          padding: 25px;
          border-radius: 15px;
          color: white;
          margin-bottom: 20px;
        }

        .price-editor h3 {
          margin-bottom: 15px;
        }

        .price-input-group {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .price-input-group input {
          width: 150px;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 1.2em;
          font-weight: 700;
        }

        /* Logo Editor */
        .logo-editor {
          background: #f8fafc;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }

        .logo-preview {
          width: 200px;
          height: 80px;
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 15px;
          background: white;
        }

        /* Video URL Section */
        .video-url-section {
          background: #fef3c7;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .video-url-section h4 {
          color: #92400e;
          margin-bottom: 10px;
        }

        .url-input-group {
          display: flex;
          gap: 10px;
        }

        .url-input-group input {
          flex: 1;
          padding: 10px 15px;
          border: 2px solid #fbbf24;
          border-radius: 8px;
        }

        /* Editor Toolbar */
        .editor-toolbar {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .editor-toolbar button {
          padding: 8px 15px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9em;
        }

        .editor-toolbar button:hover {
          background: #f8fafc;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .sidebar {
            width: 0;
            padding: 0;
          }

          .main-content {
            margin-left: 0;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">⚔️</div>
          <h2>Market Warrior</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85em', marginTop: '5px' }}>Admin Panel</p>
        </div>

        <nav className="nav-menu">
          <div className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => showSection('dashboard')}>
            <span className="nav-icon">📊</span>
            Dashboard
          </div>
          <div className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => showSection('settings')}>
            <span className="nav-icon">⚙️</span>
            Site Settings
          </div>
          <div className={`nav-item ${activeSection === 'content' ? 'active' : ''}`} onClick={() => showSection('content')}>
            <span className="nav-icon">📝</span>
            Content Editor
          </div>
          <div className={`nav-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => showSection('users')}>
            <span className="nav-icon">👥</span>
            User Management
          </div>
          <div className={`nav-item ${activeSection === 'promo' ? 'active' : ''}`} onClick={() => showSection('promo')}>
            <span className="nav-icon">🎟️</span>
            Promo Codes
          </div>
          <div className={`nav-item ${activeSection === 'affiliates' ? 'active' : ''}`} onClick={() => showSection('affiliates')}>
            <span className="nav-icon">💰</span>
            Affiliates
          </div>
          <div className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`} onClick={() => showSection('analytics')}>
            <span className="nav-icon">📈</span>
            Analytics
          </div>
          <div className={`nav-item ${activeSection === 'emails' ? 'active' : ''}`} onClick={() => showSection('emails')}>
            <span className="nav-icon">📧</span>
            Email Campaigns
          </div>
          <div className={`nav-item ${activeSection === 'community' ? 'active' : ''}`} onClick={() => showSection('community')}>
            <span className="nav-icon">💬</span>
            Community
          </div>
          <div className={`nav-item ${activeSection === 'livefeed' ? 'active' : ''}`} onClick={() => showSection('livefeed')}>
            <span className="nav-icon">📡</span>
            Live Feed
          </div>
          <div className={`nav-item ${activeSection === 'certificates' ? 'active' : ''}`} onClick={() => showSection('certificates')}>
            <span className="nav-icon">🎓</span>
            Certificates
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <h1 className="page-title">{pageTitles[activeSection]}</h1>
          <div className="user-info">
            <div>
              <div style={{ fontWeight: 600 }}>{adminName}</div>
              <div style={{ fontSize: '0.85em', color: '#64748b' }}>{adminEmail}</div>
            </div>
            <div className="user-avatar">{adminName.charAt(0).toUpperCase()}</div>
          </div>
        </div>

        {/* Dashboard Section */}
        <section className={`content-section ${activeSection === 'dashboard' ? 'active' : ''}`}>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Total Revenue</span>
                <span className="stat-icon">💰</span>
              </div>
              <div className="stat-value">$14,550</div>
              <div className="stat-change positive">↑ 12% from last month</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Active Users</span>
                <span className="stat-icon">👥</span>
              </div>
              <div className="stat-value">{stats?.totalUsers || 0}</div>
              <div className="stat-change positive">↑ {stats?.paidUsers || 0} paid</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Completion Rate</span>
                <span className="stat-icon">🏆</span>
              </div>
              <div className="stat-value">68%</div>
              <div className="stat-change positive">↑ 5% this week</div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-title">Affiliate Sales</span>
                <span className="stat-icon">🤝</span>
              </div>
              <div className="stat-value">$4,250</div>
              <div className="stat-change positive">↑ 18% this month</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Activity</h2>
            </div>
            <div>
              <p style={{ color: '#64748b' }}>Activity feed will show recent user registrations, purchases, and completions.</p>
            </div>
          </div>
        </section>

        {/* Site Settings Section */}
        <section className={`content-section ${activeSection === 'settings' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Site Settings</h2>
            </div>

            {/* Price Editor */}
            <div className="price-editor">
              <h3>💵 Challenge Price</h3>
              <p style={{ marginBottom: '15px', opacity: 0.9 }}>Set the base price for the 30-day challenge</p>
              <div className="price-input-group">
                <span style={{ fontSize: '1.5em', fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  value={challengePrice}
                  onChange={(e) => setChallengePrice(e.target.value)}
                  step="0.01"
                />
                <button className="btn btn-success" onClick={() => alert('Price updated!')}>Update Price</button>
              </div>
            </div>

            {/* Logo Editor */}
            <div className="logo-editor">
              <h3>🎨 Site Logo</h3>
              <p style={{ marginBottom: '15px', color: '#64748b' }}>Upload your logo (appears on landing page, certificate, and emails)</p>
              <div className="form-group">
                <label>Logo URL (or upload file)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={() => alert('Logo updated!')}>Update Logo</button>
                </div>
              </div>
              <div className="logo-preview">
                <span>Logo Preview</span>
              </div>
            </div>

            {/* General Settings */}
            <div className="form-group">
              <label>Site Name</label>
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Support Email</label>
              <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Access Duration (days)</label>
              <input type="number" value={accessDuration} onChange={(e) => setAccessDuration(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Maximum Devices Per User</label>
              <input type="number" value={maxDevices} onChange={(e) => setMaxDevices(e.target.value)} />
            </div>

            <button className="btn btn-primary">Save All Settings</button>
          </div>
        </section>

        {/* Content Editor Section */}
        <section className={`content-section ${activeSection === 'content' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Content Editor</h2>
            </div>

            <div className="form-group">
              <label>Select Day to Edit</label>
              <select
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setShowContentEditor(!!e.target.value);
                }}
              >
                <option value="">-- Select Day --</option>
                {dayTitles.map((title, index) => (
                  <option key={index + 1} value={index + 1}>{title}</option>
                ))}
              </select>
            </div>

            {showContentEditor && (
              <div>
                {/* Current Day Display */}
                <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' }}>
                  <h3 style={{ margin: 0 }}>{dayTitles[parseInt(selectedDay) - 1]}</h3>
                  <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Editing content for this day</p>
                </div>

                {/* YouTube URL Section */}
                <div className="video-url-section">
                  <h4>📹 YouTube Video URL</h4>
                  <p style={{ color: '#92400e', fontSize: '0.9em', marginBottom: '10px' }}>
                    Copy and paste your YouTube video URL here (e.g., https://www.youtube.com/watch?v=abc123)
                  </p>
                  <div className="url-input-group">
                    <input type="text" placeholder="https://www.youtube.com/watch?v=..." />
                    <button className="btn btn-warning">Update Video</button>
                  </div>
                </div>

                {/* Main Content Editor */}
                <div className="form-group">
                  <label>Lesson Title</label>
                  <input type="text" placeholder="Day Title" />
                </div>

                <div className="form-group">
                  <label>Main Content (HTML supported)</label>
                  <div className="editor-toolbar">
                    <button>H3</button>
                    <button>Paragraph</button>
                    <button>Bold</button>
                    <button>List</button>
                    <button>Link</button>
                    <button>📷 Image</button>
                    <button>📊 Table</button>
                    <button>👁️ Preview</button>
                  </div>
                  <textarea rows="15" placeholder="Enter lesson content here..."></textarea>
                </div>

                {/* Quiz Editor */}
                <div className="form-group">
                  <label>Quiz Questions (5 questions)</label>
                  <p style={{ color: '#64748b', fontSize: '0.9em' }}>Quiz questions will be loaded from database</p>
                  <button className="btn btn-sm btn-primary" style={{ marginTop: '10px' }}>+ Add Question</button>
                </div>

                {/* Task Editor */}
                <div className="form-group">
                  <label>Daily Task Instructions</label>
                  <textarea rows="6" placeholder="What should students do for today's task?"></textarea>
                </div>

                <div className="form-group">
                  <label>Task Type</label>
                  <select>
                    <option value="text">Written Response</option>
                    <option value="upload">File Upload</option>
                    <option value="both">Both Written + Upload</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                  <button className="btn btn-success" style={{ flex: 1 }}>💾 Save All Changes</button>
                  <button className="btn btn-primary" style={{ flex: 1 }}>👁️ Preview Day</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* User Management Section */}
        <section className={`content-section ${activeSection === 'users' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">User Management</h2>
              <div>
                <button className="btn btn-primary">Export to CSV</button>
              </div>
            </div>

            <div className="form-group">
              <input type="text" placeholder="Search users by name or email..." />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name || 'Not set'}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>
                        {user.is_admin && <span className="badge badge-danger" style={{ marginRight: '5px' }}>Admin</span>}
                        {user.has_paid ? (
                          <span className="badge badge-success">Paid</span>
                        ) : (
                          <span className="badge badge-warning">Unpaid</span>
                        )}
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-primary">View</button>
                        {' '}
                        <button className="btn btn-sm btn-warning">Unlock</button>
                        {' '}
                        <button className="btn btn-sm btn-danger">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {(!users || users.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Promo Codes Section */}
        <section className={`content-section ${activeSection === 'promo' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Promo Codes</h2>
              <button className="btn btn-primary">+ Create Promo Code</button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Uses</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>LAUNCH50</strong></td>
                  <td>50%</td>
                  <td>25/100</td>
                  <td>Dec 31, 2025</td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td>
                    <button className="btn btn-sm btn-warning">Edit</button>
                    {' '}
                    <button className="btn btn-sm btn-danger">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Affiliates Section */}
        <section className={`content-section ${activeSection === 'affiliates' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Affiliate Program</h2>
              <button className="btn btn-primary">+ Create Affiliate</button>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '20px', borderRadius: '10px', color: 'white', marginBottom: '20px' }}>
              <h4>Base Affiliate Commission</h4>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
                <input type="number" defaultValue="25" style={{ width: '100px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 700 }} />
                <span style={{ fontSize: '1.2em' }}>%</span>
                <button className="btn btn-success">Update Rate</button>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Commission %</th>
                  <th>Sales</th>
                  <th>Revenue</th>
                  <th>Pending Payout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.filter(u => u.affiliate_code).map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name || 'Unknown'}</td>
                    <td>{user.email}</td>
                    <td>25%</td>
                    <td>0</td>
                    <td>$0.00</td>
                    <td>$0.00</td>
                    <td>
                      <button className="btn btn-sm btn-success">Pay Out</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Analytics Section */}
        <section className={`content-section ${activeSection === 'analytics' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Analytics Dashboard</h2>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-title">Total Revenue (All Time)</div>
                <div className="stat-value">$45,892</div>
              </div>
              <div className="stat-card">
                <div className="stat-title">This Month</div>
                <div className="stat-value">$14,550</div>
              </div>
              <div className="stat-card">
                <div className="stat-title">Avg. Daily Revenue</div>
                <div className="stat-value">$468</div>
              </div>
              <div className="stat-card">
                <div className="stat-title">Conversion Rate</div>
                <div className="stat-value">12.5%</div>
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <h3>Revenue Chart</h3>
              <p style={{ color: '#64748b' }}>Revenue chart will be displayed here (integrated with Chart.js or similar)</p>
            </div>
          </div>
        </section>

        {/* Email Campaigns Section */}
        <section className={`content-section ${activeSection === 'emails' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Email Campaigns</h2>
            </div>

            {/* Automated Emails Info */}
            <div style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', padding: '25px', borderRadius: '15px', marginBottom: '30px' }}>
              <h3 style={{ color: '#065f46', marginBottom: '15px' }}>✅ Automated Emails (Always Active)</h3>
              <p style={{ color: '#047857', marginBottom: '15px' }}>These emails are sent automatically based on user progress:</p>

              <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
                <h4 style={{ color: '#667eea' }}>1. Welcome Email</h4>
                <p style={{ color: '#64748b', margin: '5px 0' }}>
                  <strong>Trigger:</strong> Immediately after purchase/signup<br />
                  <strong>Content:</strong> Welcome message, challenge overview, affiliate link (30% commission), expectations
                </p>
              </div>

              <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
                <h4 style={{ color: '#667eea' }}>2. Day Unlock Notifications</h4>
                <p style={{ color: '#64748b', margin: '5px 0' }}>
                  <strong>Trigger:</strong> Every 24 hours after challenge start<br />
                  <strong>Content:</strong> "New day unlocked!" + Day title + Short description
                </p>
              </div>

              <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
                <h4 style={{ color: '#667eea' }}>3. Reminder Emails</h4>
                <p style={{ color: '#64748b', margin: '5px 0' }}>
                  <strong>Trigger:</strong> 24 hours after day unlock if not completed<br />
                  <strong>Content:</strong> "Reminder: Complete Day X" + Encouragement
                </p>
              </div>

              <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
                <h4 style={{ color: '#667eea' }}>4. Completion Celebration</h4>
                <p style={{ color: '#64748b', margin: '5px 0' }}>
                  <strong>Trigger:</strong> After completing Day 30<br />
                  <strong>Content:</strong> Congratulations + Certificate link + Next steps
                </p>
              </div>
            </div>

            {/* Manual Campaign Creator */}
            <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '15px' }}>
              <h3 style={{ marginBottom: '20px' }}>📧 Send Custom Broadcast</h3>

              <div className="form-group">
                <label>Send To</label>
                <select>
                  <option>All Users</option>
                  <option>Active Users Only</option>
                  <option>Completed Users</option>
                  <option>Users on Day 1-10</option>
                  <option>Users on Day 11-20</option>
                  <option>Users on Day 21-30</option>
                  <option>Inactive Users ({'>'}7 days)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Subject Line</label>
                <input type="text" placeholder="Email subject" />
              </div>

              <div className="form-group">
                <label>Email Content</label>
                <textarea rows="10" placeholder="Email body (HTML supported)"></textarea>
              </div>

              <button className="btn btn-success">📤 Send Broadcast Email</button>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className={`content-section ${activeSection === 'community' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Community Management</h2>
              <button className="btn btn-primary">+ Create Thread</button>
            </div>

            <div className="form-group">
              <input type="text" placeholder="Search posts..." />
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Post</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Replies</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {threads?.map((thread) => (
                  <tr key={thread.id}>
                    <td>
                      <div style={{ fontWeight: 700, marginBottom: '5px' }}>{thread.title}</div>
                      <div style={{ fontSize: '0.85em', color: '#64748b' }}>{thread.content?.substring(0, 100)}...</div>
                    </td>
                    <td>{thread.author_name || 'Unknown'}</td>
                    <td><span className="badge badge-warning">{thread.category || 'General'}</span></td>
                    <td>{thread.reply_count || 0}</td>
                    <td>{new Date(thread.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-sm btn-primary">View</button>
                      {' '}
                      <button className="btn btn-sm btn-warning">Pin</button>
                      {' '}
                      <button className="btn btn-sm btn-danger">Hide</button>
                    </td>
                  </tr>
                ))}
                {(!threads || threads.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No posts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Feed Section */}
        <section className={`content-section ${activeSection === 'livefeed' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Live Feed Announcements</h2>
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea rows="4" placeholder="Enter announcement message"></textarea>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select>
                <option>Announcement</option>
                <option>Alert</option>
                <option>Trading Signal (Future)</option>
              </select>
            </div>

            <button className="btn btn-success">Post to Live Feed</button>

            <div style={{ marginTop: '30px' }}>
              <h3>Recent Posts</h3>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
                <p><strong>System:</strong> Welcome new members!</p>
                <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: '5px' }}>Posted 2 hours ago</p>
              </div>
            </div>
          </div>
        </section>

        {/* Certificates Section */}
        <section className={`content-section ${activeSection === 'certificates' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Certificate Management</h2>
            </div>

            <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
              <h4 style={{ color: '#92400e' }}>Create Certificate for Friends/Family</h4>
              <p style={{ color: '#78350f', marginBottom: '15px' }}>Create a completion certificate without requiring challenge completion</p>

              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter recipient's name" />
              </div>

              <div className="form-group">
                <label>Completion Date</label>
                <input type="date" />
              </div>

              <button className="btn btn-primary">Generate Certificate</button>
            </div>

            <h3>Certificate Template</h3>
            <p style={{ color: '#64748b', marginBottom: '15px' }}>Edit the certificate template used for all graduates</p>

            <div className="form-group">
              <label>Certificate Background Image URL</label>
              <input type="text" placeholder="https://example.com/certificate-bg.jpg" />
            </div>

            <div className="form-group">
              <label>Certificate Text Template</label>
              <textarea rows="8" placeholder="This certifies that {NAME} has successfully completed the Market Warrior 30-Day Challenge..."></textarea>
            </div>

            <button className="btn btn-success">Save Template</button>
          </div>
        </section>
      </main>
    </>
  );
}
