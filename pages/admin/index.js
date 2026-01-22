import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabaseClient } from '../../lib/supabase';

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    dailyRevenue: 0,
    conversionRate: 0,
    totalUsers: 0,
    paidUsers: 0,
    activeUsers: 0,
    completionRate: 0,
    affiliateSales: 0,
    revenueChange: 0,
    usersToday: 0,
    completionChange: 0,
    affiliateChange: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  // Content state
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    challengePrice: '39.99',
    siteName: 'Market Warrior Challenge',
    supportEmail: 'support@marketwarrior.club',
    accessDuration: 120,
    maxDevices: 2,
    logoUrl: '',
    faviconUrl: '',
  });

  // Promo codes state
  const [promoCodes, setPromoCodes] = useState([]);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Affiliates state
  const [affiliates, setAffiliates] = useState([]);
  const [baseCommission, setBaseCommission] = useState(25);

  // Community state
  const [threads, setThreads] = useState([]);

  // Live feed state
  const [liveFeedPosts, setLiveFeedPosts] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ message: '', type: 'announcement' });

  // Certificates state
  const [certificates, setCertificates] = useState([]);

  // Seeding state
  const [seedingContent, setSeedingContent] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadTabData(activeTab);
    }
  }, [activeTab, isAdmin]);

  async function checkAdmin() {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        router.push('/login');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.status === 403 || res.status === 401) {
        router.push('/dashboard');
        return;
      }

      setAdminEmail(session.user.email);
      setIsAdmin(true);
      loadTabData('dashboard');
    } catch (err) {
      console.error('Admin check error:', err);
      router.push('/dashboard');
    }
  }

  async function loadTabData(tab) {
    setLoading(true);
    try {
      switch (tab) {
        case 'dashboard':
          await loadDashboardData();
          break;
        case 'users':
          await loadUsers();
          break;
        case 'content':
          await loadContent();
          break;
        case 'settings':
          await loadSettings();
          break;
        case 'community':
          await loadCommunity();
          break;
        case 'affiliates':
          await loadAffiliates();
          break;
      }
    } catch (err) {
      console.error('Load data error:', err);
    }
    setLoading(false);
  }

  async function loadDashboardData() {
    const [statsRes, activityRes] = await Promise.all([
      fetch('/api/admin/dashboard-stats', { credentials: 'include' }),
      fetch('/api/admin/recent-activity', { credentials: 'include' }),
    ]);

    if (statsRes.ok) {
      const stats = await statsRes.json();
      setDashboardStats(stats);
    }

    if (activityRes.ok) {
      const activity = await activityRes.json();
      setRecentActivity(activity.activities || []);
    }
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  async function loadContent() {
    const res = await fetch('/api/admin/content', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setDays(data.days || []);
    }
  }

  async function loadSettings() {
    const res = await fetch('/api/admin/settings/general', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setSettings({
        challengePrice: data.challengePrice || '39.99',
        siteName: data.siteName || 'Market Warrior Challenge',
        supportEmail: data.supportEmail || 'support@marketwarrior.club',
        accessDuration: data.accessDuration || 120,
        maxDevices: 2, // Deprecated - keeping for UI compatibility but not enforced
        logoUrl: data.logoUrl || '',
        faviconUrl: data.faviconUrl || '',
      });
    }
  }

  async function saveSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challengePrice: settings.challengePrice,
          siteName: settings.siteName,
          supportEmail: settings.supportEmail,
          accessDuration: settings.accessDuration,
          logoUrl: settings.logoUrl,
          faviconUrl: settings.faviconUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('Settings saved successfully!' + (data.newPriceId ? `\nNew Stripe Price ID: ${data.newPriceId}` : ''));
        await loadSettings(); // Reload to get updated values
      } else {
        const error = await res.json();
        alert('Error saving settings: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Save settings error:', err);
      alert('Error saving settings: ' + err.message);
    }
    setLoading(false);
  }

  async function uploadFile(file, type) {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/admin/settings/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Update settings state with new URL
        if (type === 'logo') {
          setSettings({ ...settings, logoUrl: data.url });
        } else if (type === 'favicon') {
          setSettings({ ...settings, faviconUrl: data.url });
        }
        alert(`${data.message}\nURL: ${data.url}`);
        await loadSettings(); // Reload to confirm
      } else {
        const error = await res.json();
        alert('Upload failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
    }
    setLoading(false);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file, 'logo');
    }
  }

  async function handleFaviconUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file, 'favicon');
    }
  }

  async function loadCommunity() {
    const res = await fetch('/api/admin/community', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads || []);
    }
  }

  async function loadAffiliates() {
    const res = await fetch('/api/admin/affiliates', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setAffiliates(data.affiliates || []);
      if (data.baseCommission) setBaseCommission(data.baseCommission);
    }
  }

  async function loadUserDetails(userId) {
    setSelectedUser(userId);
    const res = await fetch(`/api/admin/users?userId=${userId}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUserDetails(data);
    }
  }

  async function seedAllContent() {
    if (!confirm('Import ALL 30 days from HTML files? This will overwrite existing content.')) {
      return;
    }

    setSeedingContent(true);
    try {
      const res = await fetch('/api/admin/seed-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.results?.seeded?.length || 0} days!`);
        loadContent(); // Reload the content list
      } else {
        alert('Error: ' + (data.error || 'Failed to import'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setSeedingContent(false);
  }

  async function unlockAllDays(userId) {
    if (!confirm('Unlock all 30 days for this user?')) return;
    const res = await fetch('/api/admin/unlock-all-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      alert('All days unlocked!');
      // Reload both user list and details to update UI immediately
      loadUsers();
      loadUserDetails(userId);
    }
  }

  async function resetUserProgress(userId) {
    if (!confirm('Reset all progress for this user? This will delete all quiz attempts, task submissions, and progress data. This action cannot be undone!')) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'reset_user', userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('User progress reset successfully!');
      loadUsers();
      if (selectedUser === userId) {
        loadUserDetails(userId);
      }
    } else {
      alert('Error: ' + (data.error || 'Failed to reset user'));
    }
  }

  async function grantAccess(email) {
    const res = await fetch('/api/admin/grant-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    alert(data.success ? 'Access granted!' : `Error: ${data.error}`);
    loadUsers();
  }

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'settings', icon: '⚙️', label: 'Site Settings' },
    { id: 'content', icon: '📝', label: 'Content Editor' },
    { id: 'users', icon: '👥', label: 'User Management' },
    { id: 'promo', icon: '🎟️', label: 'Promo Codes' },
    { id: 'affiliates', icon: '💰', label: 'Affiliates' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'emails', icon: '📧', label: 'Email Campaigns' },
    { id: 'community', icon: '💬', label: 'Community' },
    { id: 'livefeed', icon: '📡', label: 'Live Feed' },
    { id: 'certificates', icon: '🎓', label: 'Certificates' },
  ];

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

  if (!isAdmin && !loading) return null;

  return (
    <>
      <Head>
        <title>Admin Panel - Market Warrior</title>
      </Head>

      <div style={styles.container}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}>⚔️</div>
            <h2 style={styles.logoTitle}>Market Warrior</h2>
            <p style={styles.logoSubtitle}>Admin Panel</p>
          </div>

          <nav style={styles.navMenu}>
            {navItems.map(item => (
              <div
                key={item.id}
                style={{
                  ...styles.navItem,
                  ...(activeTab === item.id ? styles.navItemActive : {}),
                }}
                onClick={() => setActiveTab(item.id)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={styles.main}>
          {/* Top Bar */}
          <div style={styles.topBar}>
            <h1 style={styles.pageTitle}>{pageTitles[activeTab]}</h1>
            <div style={styles.userInfo}>
              <div>
                <div style={{ fontWeight: 600 }}>Admin</div>
                <div style={{ fontSize: '0.85em', color: '#64748b' }}>{adminEmail}</div>
              </div>
              <div style={styles.userAvatar}>A</div>
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div>
                  <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                      <div style={styles.statHeader}>
                        <span style={styles.statTitle}>Total Revenue</span>
                        <span style={styles.statIcon}>💰</span>
                      </div>
                      <div style={styles.statValue}>${dashboardStats.totalRevenue.toLocaleString()}</div>
                      <div style={{ ...styles.statChange, color: dashboardStats.revenueChange >= 0 ? '#10b981' : '#ef4444' }}>
                        {dashboardStats.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(dashboardStats.revenueChange)}% from last month
                      </div>
                    </div>

                    <div style={styles.statCard}>
                      <div style={styles.statHeader}>
                        <span style={styles.statTitle}>Active Users</span>
                        <span style={styles.statIcon}>👥</span>
                      </div>
                      <div style={styles.statValue}>{dashboardStats.paidUsers}</div>
                      <div style={{ ...styles.statChange, color: '#10b981' }}>
                        ↑ {dashboardStats.usersToday} new today
                      </div>
                    </div>

                    <div style={styles.statCard}>
                      <div style={styles.statHeader}>
                        <span style={styles.statTitle}>Completion Rate</span>
                        <span style={styles.statIcon}>🏆</span>
                      </div>
                      <div style={styles.statValue}>{dashboardStats.completionRate}%</div>
                      <div style={{ ...styles.statChange, color: dashboardStats.completionChange >= 0 ? '#10b981' : '#ef4444' }}>
                        {dashboardStats.completionChange >= 0 ? '↑' : '↓'} {Math.abs(dashboardStats.completionChange)}% this week
                      </div>
                    </div>

                    <div style={styles.statCard}>
                      <div style={styles.statHeader}>
                        <span style={styles.statTitle}>Affiliate Sales</span>
                        <span style={styles.statIcon}>🤝</span>
                      </div>
                      <div style={styles.statValue}>${dashboardStats.affiliateSales.toLocaleString()}</div>
                      <div style={{ ...styles.statChange, color: dashboardStats.affiliateChange >= 0 ? '#10b981' : '#ef4444' }}>
                        {dashboardStats.affiliateChange >= 0 ? '↑' : '↓'} {Math.abs(dashboardStats.affiliateChange)}% this month
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats Row */}
                  <div style={{ ...styles.statsGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div style={styles.statCardSmall}>
                      <div style={styles.statTitleSmall}>Monthly Revenue</div>
                      <div style={styles.statValueSmall}>${dashboardStats.monthlyRevenue.toLocaleString()}</div>
                    </div>
                    <div style={styles.statCardSmall}>
                      <div style={styles.statTitleSmall}>Daily Revenue</div>
                      <div style={styles.statValueSmall}>${dashboardStats.dailyRevenue.toLocaleString()}</div>
                    </div>
                    <div style={styles.statCardSmall}>
                      <div style={styles.statTitleSmall}>Conversion Rate</div>
                      <div style={styles.statValueSmall}>{dashboardStats.conversionRate}%</div>
                    </div>
                    <div style={styles.statCardSmall}>
                      <div style={styles.statTitleSmall}>Total Users</div>
                      <div style={styles.statValueSmall}>{dashboardStats.totalUsers}</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Recent Activity</h2>
                    </div>
                    <div style={styles.activityList}>
                      {recentActivity.length > 0 ? (
                        recentActivity.map((activity, idx) => (
                          <div key={idx} style={styles.activityItem}>
                            <div style={styles.activityIcon}>{activity.icon}</div>
                            <div style={styles.activityContent}>
                              <div style={styles.activityText}>{activity.text}</div>
                              <div style={styles.activityTime}>{activity.time}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#64748b' }}>No recent activity to display.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Site Settings Tab */}
              {activeTab === 'settings' && (
                <div>
                  <div style={styles.card}>
                    {/* Price Editor */}
                    <div style={styles.priceEditor}>
                      <h3>💵 Challenge Price</h3>
                      <p style={{ marginBottom: '15px', opacity: 0.9 }}>Set the base price for the 30-day challenge</p>
                      <div style={styles.priceInputGroup}>
                        <span style={{ fontSize: '1.5em', fontWeight: 700 }}>$</span>
                        <input
                          type="number"
                          value={settings.challengePrice}
                          onChange={(e) => setSettings({ ...settings, challengePrice: e.target.value })}
                          style={styles.priceInput}
                          step="0.01"
                        />
                        <button style={styles.btnSuccess} onClick={saveSettings} disabled={loading}>
                          {loading ? 'Saving...' : 'Update Price'}
                        </button>
                      </div>
                    </div>

                    {/* Logo Editor */}
                    <div style={styles.logoEditor}>
                      <h3>🎨 Site Logo</h3>
                      <p style={{ marginBottom: '15px', color: '#64748b' }}>
                        Upload your logo (appears on landing page, certificate, and emails)
                      </p>
                      {/* Logo Upload */}
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Upload Logo</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleLogoUpload}
                          disabled={loading}
                          style={{ ...styles.input, padding: '8px' }}
                        />
                        <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: '5px' }}>
                          📁 Upload PNG, JPG, or WEBP (max 5MB)
                        </p>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Or Enter Logo URL</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            value={settings.logoUrl}
                            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                            placeholder="https://example.com/logo.png"
                            style={{ ...styles.input, flex: 1 }}
                          />
                          <button style={styles.btnPrimary} onClick={saveSettings} disabled={loading}>
                            {loading ? 'Saving...' : 'Save URL'}
                          </button>
                        </div>
                        {settings.logoUrl && (
                          <div style={{ marginTop: '10px' }}>
                            <img src={settings.logoUrl} alt="Logo preview" style={{ maxWidth: '150px', maxHeight: '150px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                          </div>
                        )}
                      </div>

                      {/* Favicon Upload */}
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Upload Favicon (Browser Tab Icon)</label>
                        <input
                          type="file"
                          accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                          onChange={handleFaviconUpload}
                          disabled={loading}
                          style={{ ...styles.input, padding: '8px' }}
                        />
                        <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: '5px' }}>
                          📁 Upload ICO or PNG (32x32px or 64x64px recommended, max 5MB)
                        </p>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Or Enter Favicon URL</label>
                        <input
                          type="text"
                          value={settings.faviconUrl}
                          onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                          placeholder="https://example.com/favicon.png (defaults to logo)"
                          style={styles.input}
                        />
                        <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: '5px' }}>
                          ℹ️ Leave empty to use logo as favicon
                        </p>
                        {settings.faviconUrl && (
                          <div style={{ marginTop: '10px' }}>
                            <img src={settings.faviconUrl} alt="Favicon preview" style={{ width: '32px', height: '32px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* General Settings */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Site Name</label>
                      <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Support Email</label>
                      <input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Access Duration (days)</label>
                      <input
                        type="number"
                        value={settings.accessDuration}
                        onChange={(e) => setSettings({ ...settings, accessDuration: e.target.value })}
                        style={styles.input}
                      />
                    </div>

                    {/* Device restriction removed for better UX - users can access from any device */}
                    <div style={{ ...styles.formGroup, opacity: 0.5, pointerEvents: 'none' }}>
                      <label style={styles.label}>Maximum Devices Per User (Deprecated)</label>
                      <input
                        type="text"
                        value="Unlimited - No restrictions"
                        disabled
                        style={styles.input}
                      />
                      <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: '5px' }}>
                        ℹ️ Device restrictions have been removed for better user experience
                      </p>
                    </div>

                    <button style={styles.btnPrimary} onClick={saveSettings} disabled={loading}>
                      {loading ? 'Saving...' : 'Save All Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* Content Editor Tab */}
              {activeTab === 'content' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Course Content</h2>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          style={{ ...styles.btnSuccess, opacity: seedingContent ? 0.6 : 1 }}
                          onClick={seedAllContent}
                          disabled={seedingContent}
                        >
                          {seedingContent ? 'Importing...' : 'Import All 30 Days from HTML'}
                        </button>
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Select Day to Edit</label>
                      <select
                        style={styles.select}
                        onChange={(e) => {
                          if (e.target.value) {
                            router.push(`/admin/content/${e.target.value}`);
                          }
                        }}
                      >
                        <option value="">-- Select Day --</option>
                        {Array.from({ length: 30 }, (_, i) => {
                          const dayNum = i + 1;
                          const dayData = days.find(d => d.day === dayNum);
                          return (
                            <option key={dayNum} value={dayNum}>
                              Day {dayNum}: {dayData?.title || 'Not imported'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <table style={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Title</th>
                          <th>Video</th>
                          <th>Quiz Questions</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 30 }, (_, i) => {
                          const dayNum = i + 1;
                          const dayData = days.find(d => d.day === dayNum);
                          return (
                            <tr key={dayNum}>
                              <td>Day {dayNum}</td>
                              <td>{dayData?.title || <span style={{ color: '#94a3b8' }}>Not imported</span>}</td>
                              <td>{dayData?.video_url ? '✓' : '—'}</td>
                              <td>{dayData?.quiz_count || 0}</td>
                              <td>
                                <button
                                  style={styles.btnSmPrimary}
                                  onClick={() => router.push(`/admin/content/${dayNum}`)}
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* User Management Tab */}
              {activeTab === 'users' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>User Management</h2>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={styles.btnPrimary} onClick={() => {
                          const email = prompt('Enter email to grant access:');
                          if (email) grantAccess(email);
                        }}>
                          + Grant Access
                        </button>
                        <button style={styles.btnSuccess}>Export to CSV</button>
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.splitView}>
                      <div style={styles.userListContainer}>
                        <table style={styles.dataTable}>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th>Days Unlocked</th>
                              <th>Progress</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map(user => (
                              <tr
                                key={user.id}
                                style={selectedUser === user.id ? styles.selectedRow : {}}
                              >
                                <td>{user.full_name || '-'}</td>
                                <td>{user.email}</td>
                                <td>
                                  <span style={{
                                    ...styles.badge,
                                    ...(user.has_paid ? styles.badgeSuccess : styles.badgeWarning)
                                  }}>
                                    {user.has_paid ? 'Paid' : 'Free'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{
                                    ...styles.badge,
                                    ...(user.all_days_unlocked ? styles.badgeSuccess : styles.badgeInfo)
                                  }}>
                                    {user.all_days_unlocked ? '🔓 All 30' : `🔒 ${user.days_unlocked || 0}/30`}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ marginBottom: '5px' }}>{user.days_completed}/30 days</div>
                                  <div style={styles.progressBar}>
                                    <div style={{
                                      ...styles.progressFill,
                                      width: `${(user.days_completed / 30) * 100}%`,
                                      background: user.days_completed >= 30 ? '#10b981' : '#667eea'
                                    }}></div>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    style={styles.btnSmPrimary}
                                    onClick={() => loadUserDetails(user.id)}
                                  >
                                    View
                                  </button>
                                  <button
                                    style={{ ...styles.btnSmWarning, marginLeft: '5px' }}
                                    onClick={() => unlockAllDays(user.id)}
                                  >
                                    Unlock
                                  </button>
                                  <button
                                    style={{ ...styles.btnSmDanger, marginLeft: '5px' }}
                                    onClick={() => resetUserProgress(user.id)}
                                  >
                                    Reset
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {userDetails && (
                        <div style={styles.userDetailsPanel}>
                          <h3>User Details</h3>
                          <div style={styles.detailCard}>
                            <p><strong>Email:</strong> {userDetails.profile?.email}</p>
                            <p><strong>Name:</strong> {userDetails.profile?.full_name || '-'}</p>
                            <p><strong>Paid:</strong> {userDetails.profile?.has_paid ? 'Yes' : 'No'}</p>
                            <p><strong>Admin:</strong> {userDetails.profile?.is_admin ? 'Yes' : 'No'}</p>
                            <p><strong>Joined:</strong> {new Date(userDetails.profile?.created_at).toLocaleDateString()}</p>

                            <hr style={{ margin: '15px 0' }} />

                            <h4>Progress ({userDetails.progress?.length || 0} days)</h4>
                            <div style={styles.progressList}>
                              {userDetails.progress?.map(p => (
                                <div key={p.day} style={styles.progressItem}>
                                  Day {p.day}: {p.completed ? '✓ Completed' : 'In Progress'}
                                </div>
                              ))}
                            </div>

                            <hr style={{ margin: '15px 0' }} />

                            <h4>Quiz Attempts ({userDetails.quizAttempts?.length || 0})</h4>
                            <div style={styles.progressList}>
                              {userDetails.quizAttempts?.slice(0, 5).map((q, i) => (
                                <div key={i} style={styles.progressItem}>
                                  Day {q.day}: {q.score}/{q.total_questions} ({q.passed ? 'Passed' : 'Failed'})
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Promo Codes Tab */}
              {activeTab === 'promo' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Promo Codes</h2>
                      <button style={styles.btnPrimary} onClick={() => setShowPromoModal(true)}>
                        + Create Promo Code
                      </button>
                    </div>

                    <table style={styles.dataTable}>
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
                        {promoCodes.length > 0 ? promoCodes.map(code => (
                          <tr key={code.id}>
                            <td><strong>{code.code}</strong></td>
                            <td>{code.discount}%</td>
                            <td>{code.uses}/{code.maxUses}</td>
                            <td>{code.expires}</td>
                            <td>
                              <span style={{ ...styles.badge, ...styles.badgeSuccess }}>Active</span>
                            </td>
                            <td>
                              <button style={styles.btnSmWarning}>Edit</button>
                              <button style={{ ...styles.btnSmDanger, marginLeft: '5px' }}>Delete</button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>
                              No promo codes created yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Affiliates Tab */}
              {activeTab === 'affiliates' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Affiliate Program</h2>
                      <button style={styles.btnPrimary}>+ Create Affiliate</button>
                    </div>

                    <div style={styles.affiliateCommissionBox}>
                      <h4>Base Affiliate Commission</h4>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
                        <input
                          type="number"
                          value={baseCommission}
                          onChange={(e) => setBaseCommission(e.target.value)}
                          style={{ width: '100px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 700 }}
                        />
                        <span style={{ fontSize: '1.2em' }}>%</span>
                        <button style={styles.btnSuccess}>Update Rate</button>
                      </div>
                    </div>

                    <table style={styles.dataTable}>
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
                        {affiliates.length > 0 ? affiliates.map(aff => (
                          <tr key={aff.id}>
                            <td>{aff.name}</td>
                            <td>{aff.email}</td>
                            <td>{aff.commission}%</td>
                            <td>{aff.sales}</td>
                            <td>${aff.revenue}</td>
                            <td>${aff.pendingPayout}</td>
                            <td>
                              <button style={styles.btnSmSuccess}>Pay Out</button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>
                              No affiliates yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Analytics Dashboard</h2>
                    </div>

                    <div style={styles.statsGrid}>
                      <div style={styles.statCard}>
                        <div style={styles.statTitle}>Total Revenue (All Time)</div>
                        <div style={styles.statValue}>${dashboardStats.totalRevenue.toLocaleString()}</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statTitle}>This Month</div>
                        <div style={styles.statValue}>${dashboardStats.monthlyRevenue.toLocaleString()}</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statTitle}>Avg. Daily Revenue</div>
                        <div style={styles.statValue}>${dashboardStats.dailyRevenue.toLocaleString()}</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statTitle}>Conversion Rate</div>
                        <div style={styles.statValue}>{dashboardStats.conversionRate}%</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                      <h3>Revenue Chart</h3>
                      <p style={{ color: '#64748b' }}>Revenue chart will be displayed here (integrated with Chart.js)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Campaigns Tab */}
              {activeTab === 'emails' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Email Campaigns</h2>
                    </div>

                    {/* Automated Emails Info */}
                    <div style={styles.automatedEmailsBox}>
                      <h3 style={{ color: '#065f46', marginBottom: '15px' }}>✅ Automated Emails (Always Active)</h3>
                      <p style={{ color: '#047857', marginBottom: '15px' }}>
                        These emails are sent automatically based on user progress:
                      </p>

                      {[
                        { title: '1. Welcome Email', trigger: 'Immediately after purchase/signup', content: 'Welcome message, challenge overview, affiliate link' },
                        { title: '2. Day Unlock Notifications', trigger: 'Every 24 hours after challenge start', content: '"New day unlocked!" + Day title' },
                        { title: '3. Reminder Emails', trigger: '24 hours after day unlock if not completed', content: '"Reminder: Complete Day X"' },
                        { title: '4. Completion Celebration', trigger: 'After completing Day 30', content: 'Congratulations + Certificate link' },
                      ].map((email, i) => (
                        <div key={i} style={styles.emailTypeCard}>
                          <h4 style={{ color: '#667eea' }}>{email.title}</h4>
                          <p style={{ color: '#64748b', margin: '5px 0' }}>
                            <strong>Trigger:</strong> {email.trigger}<br />
                            <strong>Content:</strong> {email.content}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Manual Campaign */}
                    <div style={styles.manualEmailBox}>
                      <h3 style={{ marginBottom: '20px' }}>📧 Send Custom Broadcast</h3>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Send To</label>
                        <select style={styles.select}>
                          <option>All Users</option>
                          <option>Active Users Only</option>
                          <option>Completed Users</option>
                          <option>Users on Day 1-10</option>
                          <option>Users on Day 11-20</option>
                          <option>Users on Day 21-30</option>
                          <option>Inactive Users (&gt;7 days)</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Subject Line</label>
                        <input type="text" placeholder="Email subject" style={styles.input} />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Email Content</label>
                        <textarea rows={10} placeholder="Email body (HTML supported)" style={styles.textarea}></textarea>
                      </div>

                      <button style={styles.btnSuccess}>📤 Send Broadcast Email</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Community Tab */}
              {activeTab === 'community' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Community Management</h2>
                      <button style={styles.btnPrimary}>+ Create Thread</button>
                    </div>

                    <div style={styles.formGroup}>
                      <input
                        type="text"
                        placeholder="Search posts..."
                        style={styles.input}
                      />
                    </div>

                    <table style={styles.dataTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Post</th>
                          <th>Author</th>
                          <th>Replies</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {threads.length > 0 ? threads.map(thread => (
                          <tr key={thread.id}>
                            <td>
                              <div style={{ fontWeight: 700, marginBottom: '5px' }}>{thread.title}</div>
                              <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                                {thread.body?.substring(0, 100)}...
                              </div>
                            </td>
                            <td>{thread.authorName}</td>
                            <td>{thread.reply_count || 0}</td>
                            <td>{new Date(thread.created_at).toLocaleDateString()}</td>
                            <td>
                              <button style={styles.btnSmPrimary}>View</button>
                              <button style={{ ...styles.btnSmWarning, marginLeft: '5px' }}>
                                {thread.is_pinned ? 'Unpin' : 'Pin'}
                              </button>
                              <button style={{ ...styles.btnSmDanger, marginLeft: '5px' }}>Hide</button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                              No forum threads yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Live Feed Tab */}
              {activeTab === 'livefeed' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Live Feed Announcements</h2>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Message</label>
                      <textarea
                        rows={4}
                        placeholder="Enter announcement message"
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                        style={styles.textarea}
                      ></textarea>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Type</label>
                      <select
                        value={newAnnouncement.type}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                        style={styles.select}
                      >
                        <option value="announcement">Announcement</option>
                        <option value="alert">Alert</option>
                        <option value="signal">Trading Signal (Future)</option>
                      </select>
                    </div>

                    <button style={styles.btnSuccess}>Post to Live Feed</button>

                    <div style={{ marginTop: '30px' }}>
                      <h3>Recent Posts</h3>
                      {liveFeedPosts.length > 0 ? liveFeedPosts.map((post, i) => (
                        <div key={i} style={styles.liveFeedPost}>
                          <p><strong>{post.type}:</strong> {post.message}</p>
                          <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: '5px' }}>
                            Posted {post.time}
                          </p>
                        </div>
                      )) : (
                        <div style={styles.liveFeedPost}>
                          <p style={{ color: '#64748b' }}>No announcements yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Certificates Tab */}
              {activeTab === 'certificates' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Certificate Management</h2>
                    </div>

                    <div style={styles.certificateCreator}>
                      <h4 style={{ color: '#92400e' }}>Create Certificate for Friends/Family</h4>
                      <p style={{ color: '#78350f', marginBottom: '15px' }}>
                        Create a completion certificate without requiring challenge completion
                      </p>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Full Name</label>
                        <input type="text" placeholder="Enter recipient's name" style={styles.input} />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Completion Date</label>
                        <input type="date" style={styles.input} />
                      </div>

                      <button style={styles.btnPrimary}>Generate Certificate</button>
                    </div>

                    <h3>Certificate Template</h3>
                    <p style={{ color: '#64748b', marginBottom: '15px' }}>
                      Edit the certificate template used for all graduates
                    </p>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Certificate Background Image URL</label>
                      <input
                        type="text"
                        placeholder="https://example.com/certificate-bg.jpg"
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Certificate Text Template</label>
                      <textarea
                        rows={8}
                        placeholder="This certifies that {NAME} has successfully completed the Market Warrior 30-Day Challenge..."
                        style={styles.textarea}
                      ></textarea>
                    </div>

                    <button style={styles.btnSuccess}>Save Template</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
    padding: '30px 0',
    overflowY: 'auto',
    zIndex: 100,
  },
  logoSection: {
    textAlign: 'center',
    padding: '0 20px 30px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoIcon: {
    fontSize: '50px',
  },
  logoTitle: {
    color: 'white',
    fontSize: '1.5em',
    marginTop: '15px',
  },
  logoSubtitle: {
    color: '#94a3b8',
    fontSize: '0.85em',
    marginTop: '5px',
  },
  navMenu: {
    padding: '30px 0',
  },
  navItem: {
    padding: '15px 30px',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontSize: '0.95em',
  },
  navItemActive: {
    background: '#667eea',
    color: 'white',
    borderLeft: '4px solid #fbbf24',
  },
  navIcon: {
    fontSize: '1.3em',
    width: '25px',
    textAlign: 'center',
  },
  main: {
    marginLeft: '260px',
    padding: '30px',
    flex: 1,
    minHeight: '100vh',
  },
  topBar: {
    background: 'white',
    padding: '20px 30px',
    borderRadius: '15px',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  pageTitle: {
    fontSize: '2em',
    color: '#1e293b',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    background: '#667eea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statCardSmall: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  statTitle: {
    fontSize: '0.9em',
    color: '#64748b',
    fontWeight: 600,
  },
  statTitleSmall: {
    fontSize: '0.85em',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: '8px',
  },
  statIcon: {
    fontSize: '1.8em',
  },
  statValue: {
    fontSize: '2.2em',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
  },
  statValueSmall: {
    fontSize: '1.5em',
    fontWeight: 700,
    color: '#667eea',
  },
  statChange: {
    fontSize: '0.85em',
    fontWeight: 600,
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    marginBottom: '30px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f5f9',
  },
  cardTitle: {
    fontSize: '1.5em',
    color: '#1e293b',
  },
  activityList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  activityItem: {
    display: 'flex',
    gap: '15px',
    padding: '15px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  activityIcon: {
    fontSize: '1.5em',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontWeight: 500,
    color: '#1e293b',
  },
  activityTime: {
    fontSize: '0.85em',
    color: '#64748b',
    marginTop: '3px',
  },
  formGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    width: '100%',
    padding: '12px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '1em',
  },
  textarea: {
    width: '100%',
    padding: '12px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '1em',
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '12px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '1em',
    background: 'white',
  },
  dataTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  btnPrimary: {
    padding: '12px 30px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95em',
  },
  btnSuccess: {
    padding: '12px 30px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95em',
  },
  btnSmPrimary: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85em',
  },
  btnSmWarning: {
    padding: '8px 16px',
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85em',
  },
  btnSmSuccess: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85em',
  },
  btnSmDanger: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85em',
  },
  badge: {
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '0.85em',
    fontWeight: 600,
  },
  badgeSuccess: {
    background: '#d1fae5',
    color: '#065f46',
  },
  badgeWarning: {
    background: '#fef3c7',
    color: '#92400e',
  },
  badgeDanger: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  badgeInfo: {
    background: '#e0e7ff',
    color: '#3730a3',
  },
  splitView: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '20px',
  },
  userListContainer: {
    maxHeight: '600px',
    overflowY: 'auto',
  },
  userDetailsPanel: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  selectedRow: {
    background: '#f0f9ff',
  },
  detailCard: {
    marginTop: '15px',
  },
  progressList: {
    marginTop: '10px',
    maxHeight: '150px',
    overflowY: 'auto',
  },
  progressItem: {
    padding: '5px 0',
    fontSize: '0.9em',
    color: '#475569',
  },
  progressBar: {
    width: '100%',
    background: '#e2e8f0',
    borderRadius: '5px',
    height: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '5px',
  },
  priceEditor: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    padding: '25px',
    borderRadius: '15px',
    color: 'white',
    marginBottom: '20px',
  },
  priceInputGroup: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  priceInput: {
    width: '150px',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.2em',
    fontWeight: 700,
  },
  logoEditor: {
    background: '#f8fafc',
    padding: '25px',
    borderRadius: '15px',
    marginBottom: '20px',
  },
  affiliateCommissionBox: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    padding: '20px',
    borderRadius: '10px',
    color: 'white',
    marginBottom: '20px',
  },
  automatedEmailsBox: {
    background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
    padding: '25px',
    borderRadius: '15px',
    marginBottom: '30px',
  },
  emailTypeCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  manualEmailBox: {
    background: '#f8fafc',
    padding: '25px',
    borderRadius: '15px',
  },
  liveFeedPost: {
    background: '#f8fafc',
    padding: '15px',
    borderRadius: '10px',
    marginTop: '15px',
  },
  certificateCreator: {
    background: '#fef3c7',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
};
