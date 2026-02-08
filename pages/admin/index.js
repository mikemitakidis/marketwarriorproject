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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 50,
    totalUsers: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [userDetails, setUserDetails] = useState(null);
  const [userNotes, setUserNotes] = useState('');

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

  // Journal settings state
  const [journalSettings, setJournalSettings] = useState({
    aiChatEnabled: true,
    paidEnabled: false,
    etoroAffiliateUrl: '',
  });
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalUsers, setJournalUsers] = useState([]);
  const [journalStats, setJournalStats] = useState({ totalUsers: 0, paidUsers: 0, suspendedUsers: 0, totalTrades: 0, activeToday: 0 });
  const [journalUsersLoading, setJournalUsersLoading] = useState(false);
  const [editingJournalUser, setEditingJournalUser] = useState(null);

  // Promo codes state (fetched from Stripe)
  const [promoCodes, setPromoCodes] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  // Affiliates state
  const [affiliates, setAffiliates] = useState([]);
  const [baseCommission, setBaseCommission] = useState(25);

  // Live feed / Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    message: '',
    type: 'student',
    link_url: '',
    link_text: '',
    background_color: '#3b82f6',
    text_color: '#ffffff',
  });

  // Broadcast email state
  const [broadcastAudience, setBroadcastAudience] = useState('all');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTransactionalId, setBroadcastTransactionalId] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

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
        case 'journal':
          await loadJournalSettings();
          await loadJournalUsers();
          break;
        case 'affiliates':
          await loadAffiliates();
          break;
        case 'promo':
          await loadCoupons();
          break;
        case 'livefeed':
          await loadAnnouncements();
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

  async function loadUsers(page = 1) {
    const res = await fetch(`/api/admin/users?page=${page}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
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
        let message = 'Settings saved successfully!';
        if (data.pricesCreated > 0) {
          message += `\n\n✓ Created ${data.pricesCreated} currency prices`;
          if (data.newPriceIds) {
            message += ':\n';
            for (const [currency, priceId] of Object.entries(data.newPriceIds)) {
              message += `  ${currency.toUpperCase()}: ${priceId}\n`;
            }
          }
        }
        alert(message);
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

  async function loadJournalSettings() {
    try {
      const res = await fetch('/api/admin/journal-settings', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setJournalSettings({
          aiChatEnabled: data.aiChatEnabled !== false,
          paidEnabled: data.paidEnabled === true,
          etoroAffiliateUrl: data.etoroAffiliateUrl || '',
        });
      }
    } catch (err) {
      console.error('Load journal settings error:', err);
    }
  }

  async function saveJournalSettings() {
    setJournalSaving(true);
    try {
      const res = await fetch('/api/admin/journal-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(journalSettings),
      });

      if (res.ok) {
        alert('Journal settings saved successfully!');
      } else {
        const error = await res.json();
        alert('Error saving journal settings: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Save journal settings error:', err);
      alert('Error saving journal settings: ' + err.message);
    }
    setJournalSaving(false);
  }

  async function loadJournalUsers() {
    setJournalUsersLoading(true);
    try {
      const res = await fetch('/api/admin/journal-users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setJournalUsers(data.users || []);
        setJournalStats(data.stats || { totalUsers: 0, paidUsers: 0, suspendedUsers: 0, totalTrades: 0, activeToday: 0 });
      }
    } catch (err) {
      console.error('Load journal users error:', err);
    }
    setJournalUsersLoading(false);
  }

  async function updateJournalUser(userId, action, value) {
    try {
      const res = await fetch('/api/admin/journal-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, action, value }),
      });
      if (res.ok) {
        loadJournalUsers(); // Refresh the list
        setEditingJournalUser(null);
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error updating user: ' + err.message);
    }
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

  async function handleSendBroadcast() {
    if (!broadcastTransactionalId) {
      alert('Please enter your Loops Transactional Template ID');
      return;
    }
    if (!broadcastSubject || !broadcastBody) {
      alert('Subject and body are required');
      return;
    }

    setBroadcastSending(true);
    setBroadcastResult(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch('/api/admin/broadcast-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transactionalId: broadcastTransactionalId,
          subject: broadcastSubject,
          body: broadcastBody,
          audience: broadcastAudience,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        setBroadcastResult({ type: 'success', message: `Sent to ${data.sent} recipients. ${data.failed ? data.failed + ' failed.' : ''}` });
        setBroadcastSubject('');
        setBroadcastBody('');
      } else {
        setBroadcastResult({ type: 'error', message: data.error || 'Failed to send' });
      }
    } catch (err) {
      setBroadcastResult({ type: 'error', message: err.message });
    }

    setBroadcastSending(false);
  }

  async function loadAffiliates() {
    const res = await fetch('/api/admin/affiliates', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setAffiliates(data.affiliates || []);
      if (data.baseCommission) setBaseCommission(data.baseCommission);
    }
  }

  async function createAffiliate() {
    const email = prompt('Enter user email to make an affiliate:');
    if (!email) return;

    const commissionRate = prompt('Enter commission rate (default is base rate):', baseCommission.toString());

    const res = await fetch('/api/admin/affiliates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, commissionRate: parseInt(commissionRate) || baseCommission }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Affiliate created! Code: ${data.affiliateCode}`);
      await loadAffiliates();
    } else {
      const error = await res.json();
      alert(`Error: ${error.error || 'Failed to create affiliate'}`);
    }
  }

  async function updateBaseCommission() {
    const res = await fetch('/api/admin/affiliates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ baseCommission: parseInt(baseCommission) || 25 }),
    });

    if (res.ok) {
      alert('Base commission rate updated!');
    } else {
      const error = await res.json();
      alert(`Error: ${error.error || 'Failed to update rate'}`);
    }
  }

  function handlePayOut(affiliate) {
    alert(`Payouts are managed via PromoteKit.\n\nAffiliate: ${affiliate.name}\nPending: $${affiliate.pendingPayout}\n\nVisit https://affiliates.marketwarrior.club to process payouts.`);
  }

  async function loadCoupons() {
    setCouponsLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPromoCodes(data.coupons || []);
      } else {
        const error = await res.json();
        console.error('Failed to load coupons:', error);
        setPromoCodes([]);
      }
    } catch (err) {
      console.error('Error loading coupons:', err);
      setPromoCodes([]);
    }
    setCouponsLoading(false);
  }

  async function loadAnnouncements() {
    try {
      const res = await fetch('/api/admin/announcements', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Error loading announcements:', err);
    }
  }

  async function createAnnouncement() {
    if (!newAnnouncement.message.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newAnnouncement),
      });

      if (res.ok) {
        setNewAnnouncement({
          message: '',
          type: 'student',
          link_url: '',
          link_text: '',
          background_color: '#3b82f6',
          text_color: '#ffffff',
        });
        loadAnnouncements();
        alert('Announcement created successfully!');
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Failed to create announcement'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function updateAnnouncement(updates) {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setEditingAnnouncement(null);
        loadAnnouncements();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Failed to update announcement'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        loadAnnouncements();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Failed to delete announcement'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function toggleAnnouncementVisibility(announcement) {
    await updateAnnouncement({
      id: announcement.id,
      is_visible: !announcement.is_visible,
    });
  }

  async function loadUserDetails(userId) {
    setSelectedUser(userId);
    const res = await fetch(`/api/admin/users?userId=${userId}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUserDetails(data);
      setUserNotes(data.profile?.admin_notes || '');
    }
  }

  async function suspendUser(userId) {
    const durationDays = prompt('Suspend for how many days?', '7');
    if (!durationDays) return;
    const reason = prompt('Reason for suspension (optional):');

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'suspend_user', userId, durationDays, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('User suspended successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to suspend user'));
    }
  }

  async function unsuspendUser(userId) {
    if (!confirm('Remove suspension from this user?')) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'unsuspend_user', userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('User unsuspended successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to unsuspend user'));
    }
  }

  async function grantPaidAccess(userId) {
    const durationDays = prompt('Grant access for how many days?', '120');
    if (!durationDays) return;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'grant_paid_access', userId, durationDays }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Paid access granted successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to grant access'));
    }
  }

  async function revokePaidAccess(userId) {
    if (!confirm('Revoke paid access from this user?')) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'revoke_paid_access', userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Paid access revoked successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to revoke access'));
    }
  }

  async function extendAccess(userId) {
    const extendDays = prompt('Extend access by how many days?', '30');
    if (!extendDays) return;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'extend_access', userId, extendDays }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Access extended successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to extend access'));
    }
  }

  async function markAsPaid(userId) {
    const reason = prompt('Reason for marking as paid:');
    if (!reason) return;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'mark_paid', userId, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('User marked as paid!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to mark as paid'));
    }
  }

  async function markAsUnpaid(userId) {
    const reason = prompt('Reason for marking as unpaid:');
    if (!reason) return;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'mark_unpaid', userId, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('User marked as unpaid!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to mark as unpaid'));
    }
  }

  async function resetPassword(userId) {
    if (!confirm('Send password reset email to this user?')) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'reset_password', userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Password reset email sent successfully!');
    } else {
      alert('Error: ' + (data.error || 'Failed to send reset email'));
    }
  }

  async function refundPayment(userId) {
    if (!confirm('Refund the most recent payment and revoke access? This will process a Stripe refund.')) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'refund_payment', userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Payment refunded successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to refund payment'));
    }
  }

  async function lockAllDays(userId) {
    if (!confirm('Lock all days (reset to day 1 only) for this user?')) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'lock_all', userId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('All days locked successfully!');
      loadUsers();
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to lock days'));
    }
  }

  async function saveAdminNotes(userId) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'update_notes', userId, notes: userNotes }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Admin notes saved successfully!');
      loadUserDetails(userId);
    } else {
      alert('Error: ' + (data.error || 'Failed to save notes'));
    }
  }

  function exportToCSV() {
    if (users.length === 0) {
      alert('No users to export');
      return;
    }

    const headers = ['Name', 'Email', 'Status', 'Has Paid', 'Days Unlocked', 'Days Completed', 'Joined Date', 'Last Active', 'Suspended Until', 'Access Expires'];
    const rows = users.map(u => [
      u.full_name || '-',
      u.email,
      u.has_paid ? 'Paid' : 'Free',
      u.has_paid ? 'Yes' : 'No',
      u.all_days_unlocked ? 'All 30' : (u.days_unlocked || 0),
      u.days_completed || 0,
      u.created_at ? new Date(u.created_at).toLocaleDateString() : '-',
      u.last_active ? new Date(u.last_active).toLocaleString() : '-',
      u.suspended_until || '-',
      u.access_expires_at || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  function checkIfSuspended(user) {
    if (!user.suspended_until) return false;
    const suspendedDate = new Date(user.suspended_until);
    const now = new Date();
    return now < suspendedDate;
  }

  function checkIfExpired(user) {
    if (!user.has_paid || !user.access_expires_at) return false;
    const expiresDate = new Date(user.access_expires_at);
    const now = new Date();
    return now > expiresDate;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
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

  const filteredUsers = users.filter(u => {
    // Search filter
    const matchesSearch = !userSearch ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = u.has_paid;
    else if (statusFilter === 'free') matchesStatus = !u.has_paid;
    else if (statusFilter === 'suspended') matchesStatus = checkIfSuspended(u);
    else if (statusFilter === 'expired') matchesStatus = checkIfExpired(u);
    else if (statusFilter === 'active') matchesStatus = u.has_paid && !checkIfExpired(u) && !checkIfSuspended(u);

    return matchesSearch && matchesStatus;
  });

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'settings', icon: '⚙️', label: 'Site Settings' },
    { id: 'journal', icon: '📓', label: 'Trading Journal' },
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
    journal: 'Trading Journal Settings',
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
                      <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.9em', marginBottom: '10px' }}>
                          <strong>🔄 Sync Existing Stripe Prices</strong><br />
                          If you've already created prices in Stripe dashboard, click below to sync them.
                        </p>
                        <button
                          style={{ ...styles.btnPrimary, padding: '8px 16px', fontSize: '0.9em' }}
                          onClick={async () => {
                            if (!confirm('This will sync all active prices from your Stripe product to the database. Continue?')) return;
                            setLoading(true);
                            try {
                              const res = await fetch('/api/admin/settings/sync-stripe-prices', {
                                method: 'POST',
                                credentials: 'include',
                              });
                              const data = await res.json();
                              if (res.ok) {
                                let msg = data.message;
                                if (data.syncedPrices) {
                                  msg += '\n\nSynced prices:';
                                  for (const [currency, info] of Object.entries(data.syncedPrices)) {
                                    msg += `\n${currency.toUpperCase()}: ${info.amount} (${info.priceId})`;
                                  }
                                }
                                alert(msg);
                              } else {
                                alert('Error: ' + (data.error || 'Failed to sync'));
                              }
                            } catch (err) {
                              alert('Error: ' + err.message);
                            }
                            setLoading(false);
                          }}
                          disabled={loading}
                        >
                          {loading ? 'Syncing...' : 'Sync Prices from Stripe'}
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

              {/* Trading Journal Settings Tab */}
              {activeTab === 'journal' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Trading Journal Settings</h2>
                      <p style={{ opacity: 0.7, marginTop: '5px' }}>
                        Configure the standalone Trading Journal product settings
                      </p>
                    </div>

                    <div style={{ display: 'grid', gap: '30px', marginTop: '20px' }}>
                      {/* AI Chat Toggle */}
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🤖 AI Chat Coach
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.9em' }}>
                              Enable or disable the AI Coach chat feature for all journal users
                            </p>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={journalSettings.aiChatEnabled}
                              onChange={(e) => setJournalSettings({ ...journalSettings, aiChatEnabled: e.target.checked })}
                              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: '600', color: journalSettings.aiChatEnabled ? '#10b981' : '#ef4444' }}>
                              {journalSettings.aiChatEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </label>
                        </div>
                        {!journalSettings.aiChatEnabled && (
                          <div style={{ marginTop: '15px', padding: '12px', background: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '0.9em' }}>
                            When disabled, users will see: &quot;Chat has hit the usage limit. It will be back soon.&quot;
                          </div>
                        )}
                      </div>

                      {/* Paid Mode Toggle */}
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              💰 Paid Mode
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.9em' }}>
                              When enabled, users must pay to access the Trading Journal
                            </p>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={journalSettings.paidEnabled}
                              onChange={(e) => setJournalSettings({ ...journalSettings, paidEnabled: e.target.checked })}
                              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: '600', color: journalSettings.paidEnabled ? '#ef4444' : '#10b981' }}>
                              {journalSettings.paidEnabled ? 'PAID REQUIRED' : 'FREE ACCESS'}
                            </span>
                          </label>
                        </div>
                        {!journalSettings.paidEnabled && (
                          <div style={{ marginTop: '15px', padding: '12px', background: '#d1fae5', borderRadius: '8px', color: '#065f46', fontSize: '0.9em' }}>
                            Currently FREE - All registered users can access the Trading Journal
                          </div>
                        )}
                      </div>

                      {/* eToro Affiliate URL */}
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <h3 style={{ marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              eToro Affiliate URL
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.9em', margin: 0 }}>
                              Your eToro affiliate link for the Widgets page. Users will be redirected through /go/etoro.
                            </p>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={journalSettings.etoroAffiliateUrl || ''}
                          onChange={(e) => setJournalSettings({ ...journalSettings, etoroAffiliateUrl: e.target.value })}
                          placeholder="https://www.etoro.com/?ref=YOUR_ID"
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            marginTop: '10px',
                          }}
                        />
                        <p style={{ color: '#94a3b8', fontSize: '0.8em', marginTop: '8px' }}>
                          Leave empty to use default eToro URL without affiliate tracking.
                        </p>
                      </div>

                      {/* Journal Stats */}
                      <div style={{ padding: '20px', background: 'linear-gradient(135deg, #667eea20, #764ba220)', borderRadius: '12px', border: '1px solid #667eea40' }}>
                        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          📊 Journal Statistics
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                          <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.8em', fontWeight: '700', color: '#667eea' }}>{journalStats.totalUsers}</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Total Users</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.8em', fontWeight: '700', color: '#10b981' }}>{journalStats.paidUsers}</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Paid Users</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.8em', fontWeight: '700', color: '#f59e0b' }}>{journalStats.activeToday}</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Active Today</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.8em', fontWeight: '700', color: '#3b82f6' }}>{journalStats.totalTrades}</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Total Trades</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '8px' }}>
                            <div style={{ fontSize: '1.8em', fontWeight: '700', color: '#ef4444' }}>{journalStats.suspendedUsers}</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Suspended</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      style={{ ...styles.btnPrimary, marginTop: '20px', marginBottom: '30px' }}
                      onClick={saveJournalSettings}
                      disabled={journalSaving}
                    >
                      {journalSaving ? 'Saving...' : 'Save Settings'}
                    </button>

                    {/* User Management */}
                    <div style={{ marginTop: '30px' }}>
                      <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        👥 User Management
                        <button
                          onClick={loadJournalUsers}
                          style={{ marginLeft: 'auto', padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          🔄 Refresh
                        </button>
                      </h3>

                      {journalUsersLoading ? (
                        <p>Loading users...</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Trades</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>AI Limit</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Paid</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {journalUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', background: u.is_suspended ? '#fef2f2' : 'white' }}>
                                  <td style={{ padding: '12px' }}>{u.email}</td>
                                  <td style={{ padding: '12px' }}>{u.full_name || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>{u.trade_count}</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {editingJournalUser === u.id ? (
                                      <input
                                        type="number"
                                        defaultValue={u.ai_daily_limit || 10}
                                        style={{ width: '60px', padding: '4px', textAlign: 'center' }}
                                        onBlur={(e) => {
                                          updateJournalUser(u.id, 'set_ai_limit', e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateJournalUser(u.id, 'set_ai_limit', e.target.value);
                                          }
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        onClick={() => setEditingJournalUser(u.id)}
                                        style={{ cursor: 'pointer', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px' }}
                                      >
                                        {u.ai_daily_limit || 10}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {u.is_suspended ? (
                                      <span style={{ color: '#ef4444', fontWeight: '600' }}>Suspended</span>
                                    ) : (
                                      <span style={{ color: '#10b981' }}>Active</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {u.has_paid ? (
                                      <span style={{ color: '#10b981', fontWeight: '600' }}>✓ Paid</span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>Free</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                      <button
                                        onClick={() => updateJournalUser(u.id, 'suspend', !u.is_suspended)}
                                        style={{
                                          padding: '6px 12px',
                                          background: u.is_suspended ? '#10b981' : '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '0.85em'
                                        }}
                                      >
                                        {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                                      </button>
                                      <button
                                        onClick={() => updateJournalUser(u.id, 'grant_paid', !u.has_paid)}
                                        style={{
                                          padding: '6px 12px',
                                          background: u.has_paid ? '#94a3b8' : '#3b82f6',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '0.85em'
                                        }}
                                      >
                                        {u.has_paid ? 'Revoke Paid' : 'Grant Paid'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {journalUsers.length === 0 && (
                                <tr>
                                  <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                    No journal users yet
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
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
                        <button style={styles.btnSuccess} onClick={exportToCSV}>Export to CSV</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ flex: 2 }}>
                        <input
                          type="text"
                          placeholder="Search users by name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          style={styles.select}
                        >
                          <option value="all">All Users</option>
                          <option value="paid">Paid Only</option>
                          <option value="free">Free Only</option>
                          <option value="active">Active (Paid & Not Expired)</option>
                          <option value="expired">Expired Access</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
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
                              <th>Last Active</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map(user => {
                              const isSuspended = checkIfSuspended(user);
                              const isExpired = checkIfExpired(user);
                              return (
                                <tr
                                  key={user.id}
                                  style={selectedUser === user.id ? styles.selectedRow : {}}
                                >
                                  <td>{user.full_name || '-'}</td>
                                  <td>{user.email}</td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <span style={{
                                        ...styles.badge,
                                        ...(user.has_paid ? styles.badgeSuccess : styles.badgeWarning)
                                      }}>
                                        {user.has_paid ? 'Paid' : 'Free'}
                                      </span>
                                      {isSuspended && (
                                        <span style={{ ...styles.badge, ...styles.badgeDanger }}>
                                          🚫 Suspended
                                        </span>
                                      )}
                                      {isExpired && (
                                        <span style={{ ...styles.badge, ...styles.badgeWarning }}>
                                          ⏰ Expired
                                        </span>
                                      )}
                                    </div>
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
                                    <div style={{ marginBottom: '5px' }}>{user.days_completed || 0}/30 days</div>
                                    <div style={styles.progressBar}>
                                      <div style={{
                                        ...styles.progressFill,
                                        width: `${((user.days_completed || 0) / 30) * 100}%`,
                                        background: user.days_completed >= 30 ? '#10b981' : '#667eea'
                                      }}></div>
                                    </div>
                                  </td>
                                  <td style={{ fontSize: '0.85em', color: '#64748b' }}>
                                    {user.last_active ? new Date(user.last_active).toLocaleDateString() : '-'}
                                  </td>
                                  <td>
                                    <button
                                      style={styles.btnSmPrimary}
                                      onClick={() => loadUserDetails(user.id)}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {pagination.totalPages > 1 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px 20px',
                          background: '#f8fafc',
                          borderRadius: '12px',
                          marginTop: '15px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <button
                            style={{
                              ...styles.btnSmPrimary,
                              opacity: pagination.hasPrevPage ? 1 : 0.5,
                              cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed'
                            }}
                            onClick={() => pagination.hasPrevPage && loadUsers(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevPage}
                          >
                            ← Previous
                          </button>

                          <span style={{ color: '#64748b', fontSize: '0.9em' }}>
                            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} total users)
                          </span>

                          <button
                            style={{
                              ...styles.btnSmPrimary,
                              opacity: pagination.hasNextPage ? 1 : 0.5,
                              cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed'
                            }}
                            onClick={() => pagination.hasNextPage && loadUsers(pagination.currentPage + 1)}
                            disabled={!pagination.hasNextPage}
                          >
                            Next →
                          </button>
                        </div>
                      )}

                      {userDetails && (
                        <div style={styles.userDetailsPanel}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3>User Details</h3>
                            <button
                              style={{ ...styles.btnSmDanger, fontSize: '0.75em' }}
                              onClick={() => {
                                setSelectedUser(null);
                                setUserDetails(null);
                              }}
                            >
                              Close
                            </button>
                          </div>

                          <div style={styles.detailCard}>
                            <p><strong>Email:</strong> {userDetails.profile?.email}</p>
                            <p><strong>Name:</strong> {userDetails.profile?.full_name || '-'}</p>
                            <p><strong>Paid:</strong> {userDetails.profile?.has_paid ? 'Yes' : 'No'}</p>
                            <p><strong>Joined:</strong> {formatDate(userDetails.profile?.created_at)}</p>
                            <p><strong>Last Active:</strong> {formatDate(userDetails.profile?.last_active)}</p>

                            {userDetails.profile?.suspended_until && checkIfSuspended({ suspended_until: userDetails.profile.suspended_until }) && (
                              <div style={{ marginTop: '10px', padding: '10px', background: '#fee2e2', borderRadius: '8px' }}>
                                <p style={{ color: '#991b1b', fontWeight: 600 }}>🚫 SUSPENDED</p>
                                <p style={{ fontSize: '0.85em', color: '#7f1d1d' }}>Until: {formatDate(userDetails.profile.suspended_until)}</p>
                                {userDetails.profile.suspension_reason && (
                                  <p style={{ fontSize: '0.85em', color: '#7f1d1d' }}>Reason: {userDetails.profile.suspension_reason}</p>
                                )}
                              </div>
                            )}

                            {userDetails.profile?.access_expires_at && (
                              <div style={{ marginTop: '10px', padding: '10px', background: '#fef3c7', borderRadius: '8px' }}>
                                <p style={{ fontSize: '0.85em', color: '#92400e' }}>Access Expires: {formatDate(userDetails.profile.access_expires_at)}</p>
                              </div>
                            )}

                            <hr style={{ margin: '15px 0' }} />

                            {/* Admin Actions */}
                            <h4 style={{ marginBottom: '10px' }}>Admin Actions</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                              {checkIfSuspended({ suspended_until: userDetails.profile?.suspended_until }) ? (
                                <button style={styles.btnSmSuccess} onClick={() => unsuspendUser(selectedUser)}>
                                  ✓ Unsuspend User
                                </button>
                              ) : (
                                <button style={styles.btnSmDanger} onClick={() => suspendUser(selectedUser)}>
                                  🚫 Suspend User
                                </button>
                              )}

                              {userDetails.profile?.has_paid ? (
                                <button style={styles.btnSmWarning} onClick={() => revokePaidAccess(selectedUser)}>
                                  ✖ Revoke Paid Access
                                </button>
                              ) : (
                                <button style={styles.btnSmSuccess} onClick={() => grantPaidAccess(selectedUser)}>
                                  ✓ Grant Paid Access
                                </button>
                              )}

                              <button style={styles.btnSmPrimary} onClick={() => extendAccess(selectedUser)}>
                                ⏰ Extend Access
                              </button>

                              <button style={styles.btnSmWarning} onClick={() => unlockAllDays(selectedUser)}>
                                🔓 Unlock All Days
                              </button>

                              <button style={styles.btnSmDanger} onClick={() => lockAllDays(selectedUser)}>
                                🔒 Lock All Days
                              </button>

                              <button style={styles.btnSmPrimary} onClick={() => resetPassword(selectedUser)}>
                                🔑 Reset Password
                              </button>

                              <button style={styles.btnSmDanger} onClick={() => resetUserProgress(selectedUser)}>
                                ⚠️ Reset Progress
                              </button>

                              {userDetails.payments && userDetails.payments.length > 0 && (
                                <button style={styles.btnSmDanger} onClick={() => refundPayment(selectedUser)}>
                                  💸 Refund Payment
                                </button>
                              )}

                              <button style={styles.btnSmSuccess} onClick={() => markAsPaid(selectedUser)}>
                                ✓ Mark as Paid
                              </button>

                              <button style={styles.btnSmWarning} onClick={() => markAsUnpaid(selectedUser)}>
                                ✖ Mark as Unpaid
                              </button>
                            </div>

                            <hr style={{ margin: '15px 0' }} />

                            {/* Admin Notes */}
                            <h4 style={{ marginBottom: '10px' }}>Admin Notes</h4>
                            <textarea
                              value={userNotes}
                              onChange={(e) => setUserNotes(e.target.value)}
                              placeholder="Internal notes for this user..."
                              style={{ ...styles.textarea, minHeight: '80px', marginBottom: '10px' }}
                            />
                            <button style={styles.btnSmSuccess} onClick={() => saveAdminNotes(selectedUser)}>
                              Save Notes
                            </button>

                            <hr style={{ margin: '15px 0' }} />

                            {/* Payment History */}
                            <h4>Payment History ({userDetails.payments?.length || 0})</h4>
                            <div style={styles.progressList}>
                              {userDetails.payments && userDetails.payments.length > 0 ? (
                                userDetails.payments.slice(0, 5).map((payment, i) => (
                                  <div key={i} style={styles.progressItem}>
                                    <div style={{ fontWeight: 600 }}>
                                      ${(payment.amount_cents / 100).toFixed(2)} {payment.currency?.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                                      {formatDate(payment.paid_at)} - Status: {payment.status}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#64748b', fontSize: '0.9em' }}>No payment history</p>
                              )}
                            </div>

                            <hr style={{ margin: '15px 0' }} />

                            {/* Progress */}
                            <h4>Progress ({userDetails.progress?.length || 0} days)</h4>
                            <div style={styles.progressList}>
                              {userDetails.progress && userDetails.progress.length > 0 ? (
                                userDetails.progress.slice(0, 5).map(p => (
                                  <div key={p.day} style={styles.progressItem}>
                                    Day {p.day}: {p.completed ? '✓ Completed' : 'In Progress'}
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#64748b', fontSize: '0.9em' }}>No progress yet</p>
                              )}
                            </div>

                            <hr style={{ margin: '15px 0' }} />

                            {/* Quiz Attempts */}
                            <h4>Quiz Attempts ({userDetails.quizAttempts?.length || 0})</h4>
                            <div style={styles.progressList}>
                              {userDetails.quizAttempts && userDetails.quizAttempts.length > 0 ? (
                                userDetails.quizAttempts.slice(0, 5).map((q, i) => (
                                  <div key={i} style={styles.progressItem}>
                                    Day {q.day}: {q.score}/{q.total_questions} ({q.passed ? 'Passed' : 'Failed'})
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#64748b', fontSize: '0.9em' }}>No quiz attempts yet</p>
                              )}
                            </div>

                            <hr style={{ margin: '15px 0' }} />

                            {/* Audit Logs */}
                            <h4>Admin Audit Logs ({userDetails.auditLogs?.length || 0})</h4>
                            <div style={styles.progressList}>
                              {userDetails.auditLogs && userDetails.auditLogs.length > 0 ? (
                                userDetails.auditLogs.slice(0, 10).map((log, i) => (
                                  <div key={i} style={styles.progressItem}>
                                    <div style={{ fontWeight: 600 }}>{log.action}</div>
                                    <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                                      By: {log.admin_email} - {formatDate(log.created_at)}
                                    </div>
                                    {log.details && (
                                      <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>
                                        {JSON.stringify(log.details)}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#64748b', fontSize: '0.9em' }}>No audit logs yet</p>
                              )}
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
                      <h2 style={styles.cardTitle}>Stripe Promo Codes</h2>
                      <button
                        style={styles.btnSmPrimary}
                        onClick={() => loadCoupons()}
                        disabled={couponsLoading}
                      >
                        {couponsLoading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>

                    <div style={{
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '20px',
                      color: '#0369a1'
                    }}>
                      <strong>Note:</strong> Promo codes are managed directly in your{' '}
                      <a
                        href="https://dashboard.stripe.com/coupons"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', textDecoration: 'underline' }}
                      >
                        Stripe Dashboard
                      </a>
                      . This view is read-only for performance monitoring.
                    </div>

                    {couponsLoading ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <div style={styles.spinner}></div>
                        <p>Loading promo codes from Stripe...</p>
                      </div>
                    ) : (
                      <table style={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Code Name</th>
                            <th>Discount</th>
                            <th>Duration</th>
                            <th>Usage / Limits</th>
                            <th>Expiry Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {promoCodes.length > 0 ? promoCodes.map(code => (
                            <tr key={code.id}>
                              <td>
                                <strong style={{ fontFamily: 'monospace', fontSize: '1.05em' }}>{code.code}</strong>
                                {code.couponName && (
                                  <div style={{ fontSize: '0.85em', color: '#64748b', marginTop: '2px' }}>
                                    {code.couponName}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{
                                  background: '#dcfce7',
                                  color: '#166534',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 600
                                }}>
                                  {code.discount}
                                </span>
                              </td>
                              <td style={{ textTransform: 'capitalize' }}>
                                {code.duration}
                                {code.duration === 'repeating' && code.durationInMonths && (
                                  <span style={{ color: '#64748b', fontSize: '0.9em' }}>
                                    {' '}({code.durationInMonths} months)
                                  </span>
                                )}
                              </td>
                              <td>
                                {code.timesRedeemed} / {code.maxRedemptions !== null ? code.maxRedemptions : 'Unlimited'}
                              </td>
                              <td>
                                {code.expiresAt ? (
                                  <>
                                    {new Date(code.expiresAt).toLocaleDateString()}
                                    {code.isExpired && (
                                      <span style={{
                                        ...styles.badge,
                                        ...styles.badgeDanger,
                                        marginLeft: '8px',
                                        fontSize: '0.75em'
                                      }}>
                                        Expired
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ color: '#64748b' }}>No Expiration</span>
                                )}
                              </td>
                              <td>
                                {code.active && !code.isExpired ? (
                                  <span style={{ ...styles.badge, ...styles.badgeSuccess }}>Active</span>
                                ) : (
                                  <span style={{ ...styles.badge, ...styles.badgeDanger }}>Inactive</span>
                                )}
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                                No promo codes found in Stripe.
                                <br />
                                <a
                                  href="https://dashboard.stripe.com/coupons"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#667eea', marginTop: '10px', display: 'inline-block' }}
                                >
                                  Create one in Stripe Dashboard
                                </a>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {promoCodes.length > 0 && (
                      <div style={{
                        marginTop: '15px',
                        padding: '10px 15px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.9em',
                        color: '#64748b'
                      }}>
                        Showing {promoCodes.length} promo code{promoCodes.length !== 1 ? 's' : ''} from Stripe
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Affiliates Tab */}
              {activeTab === 'affiliates' && (
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Affiliate Program</h2>
                      <button style={styles.btnPrimary} onClick={createAffiliate}>+ Create Affiliate</button>
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
                        <button style={styles.btnSuccess} onClick={updateBaseCommission}>Update Rate</button>
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
                              <button style={styles.btnSmSuccess} onClick={() => handlePayOut(aff)}>Pay Out</button>
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
                        <label style={styles.label}>Loops Template ID</label>
                        <input
                          type="text"
                          placeholder="e.g. cltq1234abcd5678"
                          value={broadcastTransactionalId}
                          onChange={e => setBroadcastTransactionalId(e.target.value)}
                          style={styles.input}
                        />
                        <small style={{ color: '#64748b' }}>
                          Find this in Loops &gt; Transactional &gt; your template
                        </small>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Send To</label>
                        <select
                          value={broadcastAudience}
                          onChange={e => setBroadcastAudience(e.target.value)}
                          style={styles.select}
                        >
                          <option value="all">All Users</option>
                          <option value="active">Active Users Only</option>
                          <option value="completed">Completed Users</option>
                          <option value="day_1_10">Users on Day 1-10</option>
                          <option value="day_11_20">Users on Day 11-20</option>
                          <option value="day_21_30">Users on Day 21-30</option>
                          <option value="inactive_7d">Inactive Users (&gt;7 days)</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Subject Line</label>
                        <input
                          type="text"
                          placeholder="Email subject"
                          value={broadcastSubject}
                          onChange={e => setBroadcastSubject(e.target.value)}
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Email Content</label>
                        <textarea
                          rows={10}
                          placeholder="Email body (HTML supported)"
                          value={broadcastBody}
                          onChange={e => setBroadcastBody(e.target.value)}
                          style={styles.textarea}
                        ></textarea>
                      </div>

                      {broadcastResult && (
                        <div style={{
                          padding: '12px 16px',
                          marginBottom: '15px',
                          borderRadius: '8px',
                          background: broadcastResult.type === 'success' ? '#ecfdf5' : '#fef2f2',
                          color: broadcastResult.type === 'success' ? '#065f46' : '#991b1b',
                          border: `1px solid ${broadcastResult.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                        }}>
                          {broadcastResult.message}
                        </div>
                      )}

                      <button
                        style={{ ...styles.btnSuccess, opacity: broadcastSending ? 0.6 : 1 }}
                        onClick={handleSendBroadcast}
                        disabled={broadcastSending}
                      >
                        {broadcastSending ? 'Sending...' : '📤 Send Broadcast Email'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Community Tab - redirects to dedicated forum moderation page */}
              {activeTab === 'community' && (
                <div>
                  <div style={styles.card}>
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <h2 style={styles.cardTitle}>Community Forum Moderation</h2>
                      <p style={{ color: '#64748b', margin: '12px 0 24px' }}>
                        Full forum moderation with post & comment management, user bans, reports, and more.
                      </p>
                      <a
                        href="/admin/forum"
                        style={{ ...styles.btnPrimary, textDecoration: 'none', padding: '12px 32px', fontSize: '1rem' }}
                      >
                        Open Forum Moderation Panel
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Feed Tab */}
              {activeTab === 'livefeed' && (
                <div>
                  {/* Create New Announcement */}
                  <div style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>Create Announcement</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Message *</label>
                          <textarea
                            rows={3}
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
                            <option value="student">Student Only (Dashboard, Days, Journal, Community)</option>
                            <option value="public">Public (Landing Page + All Student Pages)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Link URL (optional)</label>
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={newAnnouncement.link_url}
                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, link_url: e.target.value })}
                            style={styles.input}
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Link Text</label>
                          <input
                            type="text"
                            placeholder="Learn More"
                            value={newAnnouncement.link_text}
                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, link_text: e.target.value })}
                            style={styles.input}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={styles.label}>Background Color</label>
                            <input
                              type="color"
                              value={newAnnouncement.background_color}
                              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, background_color: e.target.value })}
                              style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={styles.label}>Text Color</label>
                            <input
                              type="color"
                              value={newAnnouncement.text_color}
                              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, text_color: e.target.value })}
                              style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    {newAnnouncement.message && (
                      <div style={{ marginTop: '20px' }}>
                        <label style={styles.label}>Preview</label>
                        <div style={{
                          backgroundColor: newAnnouncement.background_color,
                          color: newAnnouncement.text_color,
                          padding: '12px 20px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '15px',
                        }}>
                          <span>{newAnnouncement.message}</span>
                          {newAnnouncement.link_url && (
                            <span style={{
                              background: 'rgba(255,255,255,0.2)',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}>
                              {newAnnouncement.link_text || 'Learn More'} →
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <button style={{ ...styles.btnSuccess, marginTop: '20px' }} onClick={createAnnouncement}>
                      Publish Announcement
                    </button>
                  </div>

                  {/* Existing Announcements */}
                  <div style={{ ...styles.card, marginTop: '20px' }}>
                    <div style={styles.cardHeader}>
                      <h2 style={styles.cardTitle}>All Announcements</h2>
                      <button style={styles.btnSmPrimary} onClick={loadAnnouncements}>Refresh</button>
                    </div>

                    {announcements.length > 0 ? (
                      <table style={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Message</th>
                            <th>Type</th>
                            <th>Link</th>
                            <th>Clicks</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {announcements.map(ann => (
                            <tr key={ann.id}>
                              <td>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}>
                                  <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    backgroundColor: ann.background_color,
                                    border: '1px solid #e2e8f0',
                                  }}></div>
                                  <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ann.message}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span style={{
                                  ...styles.badge,
                                  ...(ann.type === 'public' ? styles.badgeSuccess : styles.badgeInfo),
                                }}>
                                  {ann.type === 'public' ? '🌐 Public' : '👥 Student'}
                                </span>
                              </td>
                              <td>
                                {ann.link_url ? (
                                  <a href={ann.link_url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>
                                    {ann.link_text || 'Link'} ↗
                                  </a>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: ann.link_clicks > 0 ? '#10b981' : '#64748b' }}>
                                  {ann.link_clicks || 0}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  ...styles.badge,
                                  ...(ann.is_visible ? styles.badgeSuccess : styles.badgeWarning),
                                }}>
                                  {ann.is_visible ? '✓ Visible' : '○ Hidden'}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85em', color: '#64748b' }}>
                                {new Date(ann.created_at).toLocaleDateString()}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button
                                    style={ann.is_visible ? styles.btnSmWarning : styles.btnSmSuccess}
                                    onClick={() => toggleAnnouncementVisibility(ann)}
                                  >
                                    {ann.is_visible ? 'Hide' : 'Show'}
                                  </button>
                                  <button
                                    style={styles.btnSmPrimary}
                                    onClick={() => setEditingAnnouncement(ann)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    style={styles.btnSmDanger}
                                    onClick={() => deleteAnnouncement(ann.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <p>No announcements yet. Create your first announcement above!</p>
                      </div>
                    )}
                  </div>

                  {/* Edit Modal */}
                  {editingAnnouncement && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                    }}>
                      <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        width: '90%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                      }}>
                        <h3 style={{ marginBottom: '20px' }}>Edit Announcement</h3>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Message</label>
                          <textarea
                            rows={3}
                            value={editingAnnouncement.message}
                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, message: e.target.value })}
                            style={styles.textarea}
                          ></textarea>
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Type</label>
                          <select
                            value={editingAnnouncement.type}
                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, type: e.target.value })}
                            style={styles.select}
                          >
                            <option value="student">Student Only</option>
                            <option value="public">Public</option>
                          </select>
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Link URL</label>
                          <input
                            type="url"
                            value={editingAnnouncement.link_url || ''}
                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, link_url: e.target.value })}
                            style={styles.input}
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Link Text</label>
                          <input
                            type="text"
                            value={editingAnnouncement.link_text || ''}
                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, link_text: e.target.value })}
                            style={styles.input}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={styles.label}>Background Color</label>
                            <input
                              type="color"
                              value={editingAnnouncement.background_color || '#3b82f6'}
                              onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, background_color: e.target.value })}
                              style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={styles.label}>Text Color</label>
                            <input
                              type="color"
                              value={editingAnnouncement.text_color || '#ffffff'}
                              onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, text_color: e.target.value })}
                              style={{ width: '100%', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button style={styles.btnSmWarning} onClick={() => setEditingAnnouncement(null)}>
                            Cancel
                          </button>
                          <button
                            style={styles.btnSmSuccess}
                            onClick={() => updateAnnouncement(editingAnnouncement)}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
