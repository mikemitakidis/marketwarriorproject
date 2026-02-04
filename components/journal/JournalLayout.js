import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function JournalLayout({ children, user, title = 'Trading Journal', settings }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const handleLogout = async () => {
    await fetch('/api/journal/auth/logout', { method: 'POST' });
    router.push('/trading-journal/login');
  };

  const navItems = [
    { href: '/trading-journal', label: 'Dashboard' },
    { href: '/trading-journal/trades', label: 'Trade Log' },
    { href: '/trading-journal/add-trade', label: 'Add Trade' },
    { href: '/trading-journal/import', label: 'Import CSV' },
    { href: '/trading-journal/analytics', label: 'Analytics' },
    { href: '/trading-journal/goals', label: 'Goals' },
    { href: '/trading-journal/playbook', label: 'Playbook' },
    { href: '/trading-journal/ai-coach', label: 'AI Coach' },
    { href: '/trading-journal/calculators', label: 'Calculators' },
    { href: '/trading-journal/widgets', label: 'Widgets' },
    { href: '/trading-journal/charts', label: 'Charts' },
    { href: '/trading-journal/share', label: 'Share' },
    { href: '/trading-journal/challenge', label: 'Challenge' },
    { href: '/trading-journal/settings', label: 'Settings' },
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
          width: 220px;
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
          padding: 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
        }
        .logo-text {
          color: white;
          font-size: 1rem;
          font-weight: 700;
        }
        .logo-subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
        }
        .nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .nav-item {
          display: block;
          padding: 10px 14px;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-bottom: 2px;
          font-size: 0.9rem;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .nav-item.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .nav-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 12px 0;
        }
        .sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .user-details {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          color: white;
          font-weight: 500;
          font-size: 0.8rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .logout-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 0.7rem;
          padding: 4px;
        }
        .logout-btn:hover {
          color: #ef4444;
        }
        .main {
          flex: 1;
          margin-left: 220px;
          min-height: 100vh;
        }
        .content {
          padding: 30px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .course-link {
          display: block;
          padding: 8px 14px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 0.8rem;
        }
        .course-link:hover {
          color: white;
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
            flex-direction: row;
            flex-wrap: wrap;
            padding: 10px;
          }
          .nav-item {
            padding: 8px 12px;
            font-size: 0.8rem;
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
                {item.label}
              </Link>
            ))}

            <div className="nav-divider" />

            {user.isStudent && (
              <Link href="/dashboard" className="course-link">
                Back to 30-Day Challenge
              </Link>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user.fullName || user.email}</div>
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
