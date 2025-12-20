import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/recent-activity
 *
 * Returns recent activity for the admin dashboard:
 * - New user registrations
 * - Payments/purchases
 * - Day completions
 * - Quiz passes
 * - Certificate generations
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const activities = [];

    // Get recent user registrations (last 7 days)
    const { data: recentUsers } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent payments
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('user_id, amount_cents, paid_at')
      .eq('status', 'succeeded')
      .order('paid_at', { ascending: false })
      .limit(10);

    // Get recent challenge completions (day 30)
    const { data: recentCompletions } = await supabase
      .from('challenge_progress')
      .select('user_id, completed_at')
      .eq('day', 30)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(10);

    // Get recent quiz passes
    const { data: recentQuizzes } = await supabase
      .from('quiz_attempts')
      .select('user_id, day, submitted_at')
      .eq('passed', true)
      .order('submitted_at', { ascending: false })
      .limit(10);

    // Get user emails for lookups
    const userIds = new Set();
    (recentPayments || []).forEach(p => userIds.add(p.user_id));
    (recentCompletions || []).forEach(c => userIds.add(c.user_id));
    (recentQuizzes || []).forEach(q => userIds.add(q.user_id));

    let userMap = {};
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', Array.from(userIds));

      (users || []).forEach(u => {
        userMap[u.id] = u.full_name || u.email?.split('@')[0] || 'User';
      });
    }

    // Add user registrations
    (recentUsers || []).forEach(u => {
      activities.push({
        type: 'registration',
        icon: '👤',
        text: `${u.full_name || u.email?.split('@')[0] || 'New user'} registered`,
        time: formatTimeAgo(u.created_at),
        timestamp: new Date(u.created_at).getTime(),
      });
    });

    // Add payments
    (recentPayments || []).forEach(p => {
      const userName = userMap[p.user_id] || 'User';
      const amount = (p.amount_cents / 100).toFixed(2);
      activities.push({
        type: 'payment',
        icon: '💰',
        text: `${userName} purchased the challenge ($${amount})`,
        time: formatTimeAgo(p.paid_at),
        timestamp: new Date(p.paid_at).getTime(),
      });
    });

    // Add completions
    (recentCompletions || []).forEach(c => {
      const userName = userMap[c.user_id] || 'User';
      activities.push({
        type: 'completion',
        icon: '🏆',
        text: `${userName} completed the 30-day challenge!`,
        time: formatTimeAgo(c.completed_at),
        timestamp: new Date(c.completed_at).getTime(),
      });
    });

    // Add quiz passes (only high value ones)
    (recentQuizzes || []).slice(0, 5).forEach(q => {
      const userName = userMap[q.user_id] || 'User';
      activities.push({
        type: 'quiz',
        icon: '✅',
        text: `${userName} passed Day ${q.day} quiz`,
        time: formatTimeAgo(q.submitted_at),
        timestamp: new Date(q.submitted_at).getTime(),
      });
    });

    // Sort by timestamp descending and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const limitedActivities = activities.slice(0, 20);

    return res.status(200).json({ activities: limitedActivities });

  } catch (err) {
    console.error('Recent activity error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}
