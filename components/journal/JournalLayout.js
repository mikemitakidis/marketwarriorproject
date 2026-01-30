import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const SUPPORT_URL = 'https://buy.stripe.com/8x23cp0kU9gm7m65aKdAk03';

// Clean SVG icons as components
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  trades: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  addTrade: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  import: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  goals: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  aiCoach: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" /><path d="M6 10v1a6 6 0 0 0 12 0v-1" /><path d="M12 17v5" /><path d="M8 22h8" />
    </svg>
  ),
  playbook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  calculators: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10" /><line x1="12" y1="10" x2="12" y2="10" /><line x1="16" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="8" y2="18" /><line x1="12" y1="18" x2="16" y2="18" />
    </svg>
  ),
  charts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  ),
  share: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  challenge: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  guide: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  back: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" />
    </svg>
  ),
};

// Navigation grouped by section
const navSections = [
  {
    label: 'Core',
    items: [
      { href: '/trading-journal', label: 'Dashboard', icon: 'dashboard' },
      { href: '/trading-journal/trades', label: 'Trade Log', icon: 'trades' },
      { href: '/trading-journal/add-trade', label: 'Add Trade', icon: 'addTrade' },
      { href: '/trading-journal/import', label: 'Import CSV', icon: 'import' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/trading-journal/analytics', label: 'Analytics', icon: 'analytics' },
      { href: '/trading-journal/goals', label: 'Goals', icon: 'goals' },
      { href: '/trading-journal/ai-coach', label: 'AI Coach', icon: 'aiCoach' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/trading-journal/playbook', label: 'Playbook', icon: 'playbook' },
      { href: '/trading-journal/calculators', label: 'Calculators', icon: 'calculators' },
      { href: '/trading-journal/charts', label: 'Charts', icon: 'charts' },
      { href: '/trading-journal/share', label: 'Share', icon: 'share' },
      { href: '/trading-journal/challenge', label: 'Challenge', icon: 'challenge' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/trading-journal/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export default function JournalLayout({ children, user, title = 'Trading Journal', settings, accountSize }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

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
          min-height: 100vh;
        }
        .sidebar {
          width: 240px;
          background: rgba(15, 23, 42, 0.98);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
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
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          font-size: 12px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }
        .logo-text {
          color: white;
          font-size: 1rem;
          font-weight: 600;
        }
        .logo-subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
        }
        .nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
        }
        .nav-section {
          margin-bottom: 20px;
        }
        .nav-section-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 0 12px;
          margin-bottom: 8px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          border-radius: 6px;
          margin-bottom: 2px;
          transition: all 0.15s;
          font-size: 0.875rem;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }
        .nav-item.active {
          background: rgba(102, 126, 234, 0.15);
          color: #818cf8;
        }
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          opacity: 0.8;
        }
        .nav-item.active .nav-icon {
          opacity: 1;
        }
        .sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .guide-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          border-radius: 6px;
          margin-bottom: 10px;
          transition: all 0.15s;
          font-size: 0.875rem;
        }
        .guide-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }
        .support-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.85rem;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        .support-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
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
          flex-shrink: 0;
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
        .user-badge {
          display: inline-block;
          padding: 2px 6px;
          font-size: 0.6rem;
          border-radius: 3px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .badge-student {
          background: rgba(102, 126, 234, 0.2);
          color: #818cf8;
        }
        .badge-free {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        .logout-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          font-size: 0.7rem;
          padding: 4px;
          transition: color 0.15s;
        }
        .logout-btn:hover {
          color: #f87171;
        }
        .course-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 0.8rem;
          transition: color 0.15s;
          margin-top: 8px;
        }
        .course-link:hover {
          color: #818cf8;
        }
        .main {
          flex: 1;
          margin-left: 240px;
          min-height: 100vh;
        }
        .top-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 12px 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(15, 23, 42, 0.5);
        }
        .account-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          font-size: 0.8rem;
        }
        .account-label {
          color: rgba(255, 255, 255, 0.5);
        }
        .account-value {
          color: #4ade80;
          font-weight: 600;
        }
        .content {
          padding: 24px 30px;
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
          .nav {
            display: flex;
            overflow-x: auto;
            padding: 10px;
            gap: 4px;
          }
          .nav-section {
            display: flex;
            gap: 4px;
            margin-bottom: 0;
          }
          .nav-section-label {
            display: none;
          }
          .nav-item {
            flex-shrink: 0;
            padding: 8px 12px;
          }
          .top-bar {
            padding: 10px 16px;
          }
          .content {
            padding: 16px;
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
            {navSections.map((section) => (
              <div key={section.label} className="nav-section">
                <div className="nav-section-label">{section.label}</div>
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${currentPath === item.href ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{Icons[item.icon]}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}

            {user.isStudent && (
              <Link href="/dashboard" className="course-link">
                {Icons.back}
                Back to 30-Day Challenge
              </Link>
            )}
          </nav>

          <div className="sidebar-footer">
            <Link href="/trading-journal-user-guide" className="guide-link">
              {Icons.guide}
              User Guide
            </Link>

            <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="support-btn">
              <span style={{ fontSize: '14px' }}>&#10084;</span>
              Support Development
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
          {displayAccountSize && (
            <div className="top-bar">
              <div className="account-badge">
                <span className="account-label">Account Size:</span>
                <span className="account-value">{formatAccountSize(displayAccountSize)}</span>
              </div>
            </div>
          )}
          <div className="content">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
