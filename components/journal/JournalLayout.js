import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AnnouncementBanner from '../AnnouncementBanner';

export default function JournalLayout({ children, user, title = 'Trading Journal', settings }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const handleLogout = async () => {
    await fetch('/api/journal/auth/logout', { method: 'POST' });
    router.push('/trading-journal/login');
  };

  // Consolidated nav - Dashboard contains Trade Log and Add Trade as sub-tabs
  const navItems = [
    { href: '/trading-journal', label: 'Dashboard' },
    { href: '/trading-journal/import', label: 'Import CSV' },
    { href: '/trading-journal/analytics', label: 'Analytics' },
    { href: '/trading-journal/goals', label: 'Goals' },
    { href: '/trading-journal/playbook', label: 'Playbook' },
    { href: '/trading-journal/ai-coach', label: 'AI Coach' },
    { href: '/trading-journal/calculators', label: 'Calculators' },
    { href: '/trading-journal/popular-investors', label: 'Popular Investors' },
    { href: '/trading-journal/charts', label: 'Charts' },
    { href: '/trading-journal/share', label: 'Share' },
    { href: '/trading-journal/challenge', label: 'Challenge' },
    { href: '/trading-journal/settings', label: 'Settings' },
  ];

  const isActive = (href) => {
    if (href === '/trading-journal') {
      // Dashboard is active for dashboard, trades, and add-trade
      return currentPath === '/trading-journal' ||
             currentPath === '/trading-journal/trades' ||
             currentPath === '/trading-journal/add-trade';
    }
    return currentPath === href;
  };

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

        /* Sidebar navigation styles - using global to override Link defaults */
        .journal-sidebar-nav a {
          display: block;
          padding: 11px 16px;
          margin-bottom: 4px;
          color: #ffffff !important;
          text-decoration: none !important;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.15s ease;
        }
        .journal-sidebar-nav a:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }
        .journal-sidebar-nav a.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .journal-sidebar-nav .course-link-item {
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 0.8rem;
          padding: 8px 16px;
        }
        .journal-sidebar-nav .course-link-item:hover {
          color: #ffffff !important;
          background: none;
        }
        .sidebar-cta-section {
          padding: 0 10px;
          margin-top: auto;
          margin-bottom: 8px;
        }
        .sidebar-cta-card {
          display: block;
          padding: 12px 14px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 10px;
          text-decoration: none !important;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        .sidebar-cta-card:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25));
          border-color: rgba(102, 126, 234, 0.5);
          transform: translateY(-1px);
        }
        .sidebar-cta-title {
          color: #a5b4fc !important;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1.3;
        }
        .sidebar-cta-subtitle {
          color: rgba(255, 255, 255, 0.45) !important;
          font-size: 0.65rem;
          margin-top: 3px;
        }
        .sidebar-affiliate-link {
          display: block;
          padding: 8px 14px;
          color: rgba(255, 255, 255, 0.4) !important;
          text-decoration: none !important;
          font-size: 0.72rem;
          transition: color 0.2s;
        }
        .sidebar-affiliate-link:hover {
          color: rgba(255, 255, 255, 0.7) !important;
        }
      `}</style>

      <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
        }
        .sidebar {
          width: 200px;
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
          padding: 18px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .logo-icon {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: white;
        }
        .logo-text {
          color: white;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .logo-subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.65rem;
        }
        .nav {
          flex: 1;
          padding: 14px 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .nav-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 10px 0;
        }
        .sidebar-footer {
          padding: 14px 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-avatar {
          width: 30px;
          height: 30px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .user-details {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          color: white;
          font-weight: 500;
          font-size: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .logout-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 0.65rem;
          padding: 4px;
        }
        .logout-btn:hover {
          color: #ef4444;
        }
        .main {
          flex: 1;
          margin-left: 200px;
          min-height: 100vh;
        }
        .content {
          padding: 30px;
          max-width: 1400px;
          margin: 0 auto;
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

          <nav className="nav journal-sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? 'active' : ''}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="sidebar-cta-section">
            <a
              href="https://www.marketwarrior.club"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-cta-card"
            >
              <div className="sidebar-cta-title">Join the Market Warrior Trading Challenge</div>
              <div className="sidebar-cta-subtitle">Learn to trade in 30 days &rarr;</div>
            </a>
            <a
              href="https://www.marketwarrior.club/affiliate"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-affiliate-link"
            >
              Become an Affiliate
            </a>
          </div>

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
          <AnnouncementBanner type="journal" />
          <div className="content">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
