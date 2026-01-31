import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SUPPORT_URL = 'https://buy.stripe.com/8x23cp0kU9gm7m65aKdAk03';

export default function JournalLayout({ children, user, title = 'Trading Journal', settings, accountSize }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const handleLogout = async () => {
    await fetch('/api/journal/auth/logout', { method: 'POST' });
    router.push('/trading-journal/login');
  };

  // Header navigation items (Core actions)
  const headerNavItems = [
    { href: '/trading-journal', label: 'Dashboard' },
    { href: '/trading-journal/trades', label: 'Trade Log' },
    { href: '/trading-journal/add-trade', label: 'Add Trade' },
    { href: '/trading-journal/analytics', label: 'Analytics' },
  ];

  // Sidebar navigation items (Tools & Settings)
  const sidebarNavItems = [
    { href: '/trading-journal/import', label: 'Import CSV' },
    { href: '/trading-journal/goals', label: 'Goals' },
    { href: '/trading-journal/ai-coach', label: 'AI Coach' },
    { href: '/trading-journal/playbook', label: 'Playbook' },
    { href: '/trading-journal/calculators', label: 'Calculators' },
    { href: '/trading-journal/charts', label: 'Charts' },
    { href: '/trading-journal/share', label: 'Share' },
    { href: '/trading-journal/challenge', label: 'Challenge' },
    { href: '/trading-journal/settings', label: 'Settings' },
  ];

  // Format account size for display
  const formatAccountSize = (size) => {
    if (!size) return null;
    const currency = settings?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(size);
  };

  const displayAccountSize = accountSize || settings?.account_size;

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
          flex-direction: column;
          min-height: 100vh;
        }

        /* Top Header with Logo and Main Nav */
        .top-header {
          background: rgba(15, 23, 42, 0.98);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
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
          font-size: 12px;
          font-weight: 700;
          color: white;
        }
        .logo-text {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
        }

        /* Header Navigation - White framed buttons */
        .header-nav {
          display: flex;
          gap: 8px;
        }
        .header-nav-item {
          padding: 8px 16px;
          background: white;
          color: #1e293b;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.15s;
          border: 2px solid white;
        }
        .header-nav-item:hover {
          background: #f1f5f9;
        }
        .header-nav-item.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        /* Header Right - Account Size & User */
        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .account-badge {
          padding: 6px 12px;
          background: rgba(74, 222, 128, 0.15);
          border: 1px solid rgba(74, 222, 128, 0.3);
          border-radius: 6px;
          font-size: 0.8rem;
          color: #4ade80;
          font-weight: 500;
        }
        .user-menu {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .user-name {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
        }
        .logout-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.6);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.15s;
        }
        .logout-btn:hover {
          border-color: #f87171;
          color: #f87171;
        }

        /* Main Content Area with Sidebar */
        .main-area {
          display: flex;
          flex: 1;
        }

        /* Left Sidebar - Tools */
        .sidebar {
          width: 200px;
          background: rgba(15, 23, 42, 0.6);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
        }
        .sidebar-title {
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 0 8px;
          margin-bottom: 12px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        /* Sidebar Nav Items - White framed */
        .sidebar-nav-item {
          padding: 10px 14px;
          background: white;
          color: #1e293b;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.15s;
          border: 2px solid white;
        }
        .sidebar-nav-item:hover {
          background: #f1f5f9;
        }
        .sidebar-nav-item.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        /* Sidebar Footer */
        .sidebar-footer {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .guide-link {
          display: block;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 8px;
          transition: all 0.15s;
          text-align: center;
        }
        .guide-link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .support-btn {
          display: block;
          width: 100%;
          padding: 10px 14px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.85rem;
          text-align: center;
          transition: all 0.2s;
        }
        .support-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .course-link {
          display: block;
          padding: 10px 14px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 0.8rem;
          text-align: center;
          margin-top: 8px;
          transition: color 0.15s;
        }
        .course-link:hover {
          color: #818cf8;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          padding: 24px 32px;
          max-width: 1400px;
        }

        /* Mobile Responsive */
        @media (max-width: 1024px) {
          .header-nav {
            display: none;
          }
          .sidebar {
            width: 180px;
          }
        }
        @media (max-width: 768px) {
          .top-header {
            flex-wrap: wrap;
            gap: 12px;
          }
          .header-right {
            order: 3;
            width: 100%;
            justify-content: space-between;
          }
          .sidebar {
            display: none;
          }
          .main-content {
            padding: 16px;
          }
        }
      `}</style>

      <div className="layout">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <Link href="/trading-journal" className="logo">
              <div className="logo-icon">MW</div>
              <span className="logo-text">Trading Journal</span>
            </Link>

            {/* Header Navigation - Core actions */}
            <nav className="header-nav">
              {headerNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`header-nav-item ${currentPath === item.href ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="header-right">
            {displayAccountSize && (
              <div className="account-badge">
                Account: {formatAccountSize(displayAccountSize)}
              </div>
            )}
            <div className="user-menu">
              <div className="user-avatar">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.fullName || user.email}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Area with Sidebar */}
        <div className="main-area">
          {/* Left Sidebar - Tools */}
          <aside className="sidebar">
            <div className="sidebar-title">Tools</div>
            <nav className="sidebar-nav">
              {sidebarNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${currentPath === item.href ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="sidebar-footer">
              <Link href="/trading-journal-user-guide" className="guide-link">
                User Guide
              </Link>
              <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="support-btn">
                Support Development
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
