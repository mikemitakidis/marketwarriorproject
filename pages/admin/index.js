import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [days, setDays] = useState([]);
  const [stats, setStats] = useState({ users: 0, paid: 0, completed: 0 });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/admin/users');
      if (res.status === 403 || res.status === 401) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      loadData();
    } catch (err) {
      console.error('Admin check error:', err);
      router.push('/dashboard');
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, daysRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/content'),
      ]);

      const usersData = await usersRes.json();
      const daysData = await daysRes.json();

      setUsers(usersData.users || []);
      setDays(daysData.days || []);

      // Calculate stats
      const userList = usersData.users || [];
      setStats({
        users: userList.length,
        paid: userList.filter(u => u.has_paid).length,
        completed: userList.filter(u => u.days_completed >= 30).length,
      });
    } catch (err) {
      console.error('Load data error:', err);
    }
    setLoading(false);
  }

  async function handleImportContent() {
    if (!confirm('This will import/update all 30 days of content from templates. Continue?')) {
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/admin/import-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      setImportResult(data);

      if (data.success) {
        loadData();
      }
    } catch (err) {
      setImportResult({ success: false, error: err.message });
    }
    setImporting(false);
  }

  async function loadUserDetails(userId) {
    setSelectedUser(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`);
      const data = await res.json();
      setUserDetails(data);
    } catch (err) {
      console.error('Error loading user details:', err);
    }
  }

  async function unlockAllDays(userId) {
    if (!confirm('Unlock all 30 days for this user?')) return;

    try {
      const res = await fetch('/api/admin/unlock-all-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (data.success) {
        alert('All days unlocked successfully!');
        loadUserDetails(userId);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  const filteredUsers = users.filter(u =>
    !searchTerm ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Panel - Market Warrior</title>
      </Head>

      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}>MW</div>
            <h2 style={styles.logoTitle}>Admin Panel</h2>
          </div>

          <nav style={styles.nav}>
            <div
              style={{...styles.navItem, ...(activeTab === 'dashboard' ? styles.navItemActive : {})}}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </div>
            <div
              style={{...styles.navItem, ...(activeTab === 'users' ? styles.navItemActive : {})}}
              onClick={() => setActiveTab('users')}
            >
              Users
            </div>
            <div
              style={{...styles.navItem, ...(activeTab === 'content' ? styles.navItemActive : {})}}
              onClick={() => setActiveTab('content')}
            >
              Content
            </div>
            <div
              style={{...styles.navItem, ...(activeTab === 'import' ? styles.navItemActive : {})}}
              onClick={() => setActiveTab('import')}
            >
              Import
            </div>
          </nav>

          <div style={styles.sidebarFooter}>
            <button
              style={styles.backButton}
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.main}>
          {activeTab === 'dashboard' && (
            <div>
              <h1 style={styles.pageTitle}>Dashboard</h1>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.users}</div>
                  <div style={styles.statLabel}>Total Users</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.paid}</div>
                  <div style={styles.statLabel}>Paid Users</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{days.length}</div>
                  <div style={styles.statLabel}>Days in DB</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.completed}</div>
                  <div style={styles.statLabel}>Completed Challenge</div>
                </div>
              </div>

              <div style={styles.card}>
                <h3>Recent Users</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Paid</th>
                      <th>Days</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 10).map(user => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>{user.full_name || '-'}</td>
                        <td>{user.has_paid ? 'Yes' : 'No'}</td>
                        <td>{user.days_completed}/30</td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h1 style={styles.pageTitle}>Users</h1>

              <div style={styles.searchBar}>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              <div style={styles.splitView}>
                <div style={styles.userList}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Paid</th>
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
                          <td>{user.email}</td>
                          <td>{user.has_paid ? 'Yes' : 'No'}</td>
                          <td>{user.days_completed}/30</td>
                          <td>
                            <button
                              style={styles.smallButton}
                              onClick={() => loadUserDetails(user.id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {userDetails && (
                  <div style={styles.userDetails}>
                    <h3>User Details</h3>
                    <div style={styles.detailCard}>
                      <p><strong>Email:</strong> {userDetails.profile?.email}</p>
                      <p><strong>Name:</strong> {userDetails.profile?.full_name || '-'}</p>
                      <p><strong>Paid:</strong> {userDetails.profile?.has_paid ? 'Yes' : 'No'}</p>
                      <p><strong>Admin:</strong> {userDetails.profile?.is_admin ? 'Yes' : 'No'}</p>
                      <p><strong>All Days Unlocked:</strong> {userDetails.profile?.all_days_unlocked ? 'Yes' : 'No'}</p>
                      <p><strong>Joined:</strong> {new Date(userDetails.profile?.created_at).toLocaleString()}</p>

                      <hr style={{margin: '15px 0'}} />

                      <h4>Progress ({userDetails.progress?.length || 0} days)</h4>
                      <div style={styles.progressList}>
                        {userDetails.progress?.map(p => (
                          <div key={p.day} style={styles.progressItem}>
                            Day {p.day}: {p.completed ? 'Completed' : 'In Progress'}
                          </div>
                        ))}
                      </div>

                      <hr style={{margin: '15px 0'}} />

                      <h4>Quiz Attempts ({userDetails.quizAttempts?.length || 0})</h4>
                      <div style={styles.progressList}>
                        {userDetails.quizAttempts?.slice(0, 5).map((q, i) => (
                          <div key={i} style={styles.progressItem}>
                            Day {q.day}: {q.score}/{q.total_questions} ({q.passed ? 'Passed' : 'Failed'})
                          </div>
                        ))}
                      </div>

                      <hr style={{margin: '15px 0'}} />

                      <h4>Task Submissions ({userDetails.taskSubmissions?.length || 0})</h4>
                      <div style={styles.progressList}>
                        {userDetails.taskSubmissions?.slice(0, 5).map((t, i) => (
                          <div key={i} style={styles.progressItem}>
                            Day {t.day}: Submitted {new Date(t.submitted_at).toLocaleDateString()}
                            {t.attachment_url && ' (with file)'}
                          </div>
                        ))}
                      </div>

                      <hr style={{margin: '15px 0'}} />

                      <button
                        style={styles.actionButton}
                        onClick={() => unlockAllDays(selectedUser)}
                      >
                        Unlock All Days
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div>
              <h1 style={styles.pageTitle}>Course Content</h1>

              {days.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No content in database. Go to Import tab to import content from templates.</p>
                </div>
              ) : (
                <div style={styles.card}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Title</th>
                        <th>Video</th>
                        <th>Quiz Questions</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map(day => (
                        <tr key={day.day}>
                          <td>Day {day.day}</td>
                          <td>{day.title}</td>
                          <td>{day.video_url ? 'Yes' : 'No'}</td>
                          <td>{day.quiz_count || 0}</td>
                          <td>{day.updated_at ? new Date(day.updated_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <h1 style={styles.pageTitle}>Import Content</h1>

              <div style={styles.card}>
                <h3>Import from Templates</h3>
                <p style={{marginBottom: '20px', color: '#64748b'}}>
                  This will import all 30 days of content from the HTML templates in
                  <code style={styles.code}>templates/days/market_warrior_days_content/</code>
                </p>

                <button
                  style={{...styles.actionButton, opacity: importing ? 0.6 : 1}}
                  onClick={handleImportContent}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Import All Content'}
                </button>

                {importResult && (
                  <div style={{
                    ...styles.resultBox,
                    background: importResult.success ? '#dcfce7' : '#fee2e2',
                    border: importResult.success ? '1px solid #86efac' : '1px solid #fca5a5',
                  }}>
                    <h4>{importResult.success ? 'Import Successful!' : 'Import Failed'}</h4>
                    {importResult.message && <p>{importResult.message}</p>}
                    {importResult.error && <p style={{color: '#dc2626'}}>{importResult.error}</p>}

                    {importResult.results && (
                      <div style={{marginTop: '15px', maxHeight: '300px', overflow: 'auto'}}>
                        {importResult.results.map((r, i) => (
                          <div key={i} style={{
                            padding: '5px 10px',
                            background: r.success ? '#f0fdf4' : '#fef2f2',
                            marginBottom: '5px',
                            borderRadius: '4px',
                          }}>
                            Day {r.day}: {r.success ? `"${r.title}" (${r.quizCount || 0} quiz questions)` : r.error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .admin-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
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
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f1f5f9',
  },
  sidebar: {
    width: '260px',
    background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
    padding: '30px 0',
    position: 'fixed',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  logoSection: {
    textAlign: 'center',
    padding: '0 20px 30px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoIcon: {
    width: '60px',
    height: '60px',
    background: '#667eea',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '20px',
  },
  logoTitle: {
    color: 'white',
    fontSize: '1.3em',
    marginTop: '15px',
  },
  nav: {
    padding: '30px 0',
    flex: 1,
  },
  navItem: {
    padding: '15px 30px',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  navItemActive: {
    background: '#667eea',
    color: 'white',
    borderLeft: '4px solid #fbbf24',
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  backButton: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  main: {
    marginLeft: '260px',
    padding: '30px',
    flex: 1,
  },
  pageTitle: {
    fontSize: '2em',
    marginBottom: '30px',
    color: '#1e293b',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statValue: {
    fontSize: '2.5em',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    color: '#64748b',
    marginTop: '5px',
  },
  card: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  searchBar: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  splitView: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '20px',
  },
  userList: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    maxHeight: '70vh',
    overflow: 'auto',
  },
  userDetails: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    maxHeight: '70vh',
    overflow: 'auto',
  },
  selectedRow: {
    background: '#f0f9ff',
  },
  smallButton: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  detailCard: {
    marginTop: '15px',
  },
  progressList: {
    marginTop: '10px',
    maxHeight: '120px',
    overflow: 'auto',
  },
  progressItem: {
    padding: '5px 0',
    fontSize: '13px',
    color: '#475569',
  },
  actionButton: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  emptyState: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#64748b',
  },
  code: {
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  resultBox: {
    marginTop: '20px',
    padding: '20px',
    borderRadius: '8px',
  },
};
