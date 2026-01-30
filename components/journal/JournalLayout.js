import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SUPPORT_URL = 'https://buy.stripe.com/8x23cp0kU9gm7m65aKdAk03';

export default function JournalLayout({ children, user, title = 'Trading Journal', settings }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navItems = [
    { href: '/trading-journal', label: 'Dashboard', icon: '📊' },
    { href: '/trading-journal/trades', label: 'Trade Log', icon: '📝' },
    { href: '/trading-journal/add-trade', label: 'Add Trade', icon: '➕' },
    { href: '/trading-journal/import', label: 'Import CSV', icon: '📥' },
    { href: '/trading-journal/analytics', label: 'Analytics', icon: '📈' },
    { href: '/trading-journal/goals', label: 'Goals', icon: '🏆' },
    { href: '/trading-journal/playbook', label: 'Playbook', icon: '📚' },
    { href: '/trading-journal/ai-coach', label: 'AI Coach', icon: '🤖' },
    { href: '/trading-journal/calculators', label: 'Calculators', icon: '🧮' },
    { href: '/trading-journal/charts', label: 'Charts', icon: '📉' },
    { href: '/trading-journal/share', label: 'Share', icon: '🔗' },
    { href: '/trading-journal/challenge', label: 'Challenge', icon: '🎯' },
    { href: '/trading-journal/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <>
      <Head>
        <title>{title} - Market Warrior</title>
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1e2e 100%);
          color: #e0e0e0;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
        }
        .sidebar {
          width: 260px;
          background: rgba(30, 41, 59, 0.95);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
        }
        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
        }
        .logo-text {
          color: white;
          font-size: 1.1rem;
          font-weight: 700;
        }
        .logo-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
        }
        .nav {
          flex: 1;
          padding: 20px 12px;
          overflow-y: auto;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          border-radius: 8px;
          margin-bottom: 4px;
          transition: all 0.2s;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
        .nav-item.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          color: #667eea;
          border: 1px solid rgba(102, 126, 234, 0.3);
        }
        .nav-icon {
          font-size: 1.2rem;
        }
        .nav-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 16px 0;
        }
        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .support-btn {
          display: block;
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        .support-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }
        .user-details {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-badge {
          display: inline-block;
          padding: 2px 6px;
          font-size: 0.65rem;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .badge-student {
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
        }
        .badge-free {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .logout-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 0.75rem;
          padding: 4px;
        }
        .logout-btn:hover {
          color: #ef4444;
        }
        .main {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
        }
        .content {
          padding: 30px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .course-link {
          display: block;
          padding: 10px 16px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }
        .course-link:hover {
          color: #667eea;
        }
        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
          }
          .main {
            margin-left: 0;
          }
          .nav {
            display: flex;
            overflow-x: auto;
            padding: 10px;
          }
          .nav-item {
            flex-shrink: 0;
            padding: 10px 14px;
          }
        }
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Link href="/trading-journal" className="logo">
              <div className="logo-icon">MW</div>
              <div>
                <div className="logo-text">Trading Journal</div>
                <div className="logo-subtitle">Market Warrior</div>
              </div>
            </Link>
          </div>

          <nav className="nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${currentPath === item.href ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            <div className="nav-divider" />

            {user.isStudent && (
              <Link href="/dashboard" className="course-link">
                ← Back to 30-Day Challenge
              </Link>
            )}
          </nav>

          <div className="sidebar-footer">
            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="support-btn">
              ❤️ Support Development
            </a>

            <div className="user-info">
              <div className="user-avatar">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user.fullName || user.email}</div>
                <span className={`user-badge ${user.isStudent ? 'badge-student' : 'badge-free'}`}>
                  {user.isStudent ? 'Student' : 'Free'}
                </span>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Logout">
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="content">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
