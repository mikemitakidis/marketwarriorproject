import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/admin/dashboard-stats
 *
 * Returns dashboard statistics for the admin panel:
 * - Total revenue (all time, monthly, daily)
 * - Conversion rate
 * - Total users, paid users, active users
 * - Completion rate
 * - Affiliate sales
 * - Various trend percentages
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

    // Get date boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      paymentsAll,
      paymentsThisMonth,
      paymentsLastMonth,
      paymentsToday,
      usersAll,
      usersToday,
      paidUsers,
      progressData,
      progressLastWeek,
      affiliateData,
      affiliateLastMonth,
    ] = await Promise.all([
      // All payments
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded'),
      // This month payments
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded').gte('paid_at', monthStart.toISOString()),
      // Last month payments
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded').gte('paid_at', lastMonthStart.toISOString()).lte('paid_at', lastMonthEnd.toISOString()),
      // Today payments
      supabase.from('payments').select('amount_cents').eq('status', 'succeeded').gte('paid_at', today.toISOString()),
      // All users
      supabase.from('user_profiles').select('id, has_paid, created_at'),
      // Users created today
      supabase.from('user_profiles').select('id').gte('created_at', today.toISOString()),
      // Paid users
      supabase.from('user_profiles').select('id').eq('has_paid', true),
      // Challenge progress (users who completed day 30)
      supabase.from('challenge_progress').select('user_id, completed').eq('day', 30).eq('completed', true),
      // Progress last week for comparison
      supabase.from('challenge_progress').select('user_id, completed, completed_at').eq('day', 30).eq('completed', true).gte('completed_at', weekAgo.toISOString()),
      // Affiliate referrals this month
      supabase.from('affiliate_referrals').select('commission_amount').gte('created_at', monthStart.toISOString()),
      // Affiliate referrals last month
      supabase.from('affiliate_referrals').select('commission_amount').gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
    ]);

    // Calculate revenue stats
    const totalRevenue = (paymentsAll.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
    const monthlyRevenue = (paymentsThisMonth.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
    const lastMonthRevenue = (paymentsLastMonth.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
    const dailyRevenue = (paymentsToday.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;

    // Calculate revenue change percentage
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthlyRevenue > 0 ? 100 : 0;

    // Calculate user stats
    const totalUsers = (usersAll.data || []).length;
    const paidUsersCount = (paidUsers.data || []).length;
    const newUsersToday = (usersToday.data || []).length;

    // Calculate conversion rate (paid users / total users)
    const conversionRate = totalUsers > 0
      ? Math.round((paidUsersCount / totalUsers) * 100 * 10) / 10
      : 0;

    // Calculate completion rate (completed day 30 / paid users)
    const completedUsers = (progressData.data || []).length;
    const completionRate = paidUsersCount > 0
      ? Math.round((completedUsers / paidUsersCount) * 100)
      : 0;

    // Calculate completion change (this week vs last week)
    const completedThisWeek = (progressLastWeek.data || []).length;
    const completionChange = completedThisWeek > 0 ? Math.round((completedThisWeek / Math.max(completedUsers, 1)) * 100) : 0;

    // Calculate affiliate stats
    const affiliateSales = (affiliateData.data || []).reduce((sum, r) => sum + (r.commission_amount || 0), 0) / 100;
    const affiliateLastMonthTotal = (affiliateLastMonth.data || []).reduce((sum, r) => sum + (r.commission_amount || 0), 0) / 100;
    const affiliateChange = affiliateLastMonthTotal > 0
      ? Math.round(((affiliateSales - affiliateLastMonthTotal) / affiliateLastMonthTotal) * 100)
      : affiliateSales > 0 ? 100 : 0;

    // Calculate average daily revenue (this month)
    const daysInMonth = now.getDate();
    const avgDailyRevenue = daysInMonth > 0 ? Math.round(monthlyRevenue / daysInMonth) : 0;

    return res.status(200).json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      dailyRevenue: avgDailyRevenue,
      conversionRate,
      totalUsers,
      paidUsers: paidUsersCount,
      activeUsers: paidUsersCount, // Same as paid users for now
      completionRate,
      affiliateSales: Math.round(affiliateSales * 100) / 100,
      revenueChange,
      usersToday: newUsersToday,
      completionChange,
      affiliateChange,
    });

  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
