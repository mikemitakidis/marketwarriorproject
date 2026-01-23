import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';
import Stripe from 'stripe';

/**
 * Fetch net amount from Stripe balance transaction for a payment intent
 * @param {Stripe} stripe - Stripe instance
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<number>} Net amount in cents
 */
async function getNetAmountFromStripe(stripe, paymentIntentId) {
  try {
    if (!paymentIntentId) return 0;

    // Get payment intent with balance transaction
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.charges?.data?.[0]?.balance_transaction) {
      // Fallback to original amount if balance_transaction not available
      return paymentIntent.amount || 0;
    }

    const balanceTransactionId = paymentIntent.charges.data[0].balance_transaction;

    // Fetch balance transaction to get net amount
    const balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransactionId);

    // Return net amount (amount after fees)
    return balanceTransaction.net || 0;
  } catch (err) {
    logger.error('Error fetching balance transaction:', err.message);
    return 0;
  }
}

/**
 * Calculate total net revenue from payments
 * Uses stored net_amount_cents when available, falls back to Stripe API for missing values
 * @param {Stripe} stripe - Stripe instance
 * @param {Array} payments - Array of payment records with net_amount_cents and payment_intent_id
 * @returns {Promise<number>} Total net revenue in cents
 */
async function calculateNetRevenue(stripe, payments) {
  if (!payments || payments.length === 0) return 0;

  // Separate payments with stored net amount vs ones that need fetching
  const paymentsWithNet = payments.filter(p => p.net_amount_cents != null);
  const paymentsNeedFetch = payments.filter(p => p.net_amount_cents == null && p.payment_intent_id);

  // Sum already-stored net amounts
  const storedNet = paymentsWithNet.reduce((sum, p) => sum + p.net_amount_cents, 0);

  // Fetch missing net amounts from Stripe API (for old payments)
  let fetchedNet = 0;
  if (paymentsNeedFetch.length > 0) {
    logger.log(`Fetching net amounts for ${paymentsNeedFetch.length} payments from Stripe API`);
    const netAmounts = await Promise.all(
      paymentsNeedFetch.map(p => getNetAmountFromStripe(stripe, p.payment_intent_id))
    );
    fetchedNet = netAmounts.reduce((sum, amount) => sum + amount, 0);
  }

  return storedNet + fetchedNet;
}

/**
 * API route: /api/admin/dashboard-stats
 *
 * Returns dashboard statistics for the admin panel:
 * - Total revenue (NET amount after Stripe fees)
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
    // SECURITY: Verify admin authorization (checks is_admin + email allowlist)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Apply rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe configuration missing' });
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Get date boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel - use stored net_amount_cents for performance
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
      // All payments - use net_amount_cents (stored from webhook)
      supabase.from('payments').select('amount_cents, net_amount_cents, payment_intent_id').eq('status', 'succeeded'),
      // This month payments
      supabase.from('payments').select('amount_cents, net_amount_cents, payment_intent_id').eq('status', 'succeeded').gte('paid_at', monthStart.toISOString()),
      // Last month payments
      supabase.from('payments').select('amount_cents, net_amount_cents, payment_intent_id').eq('status', 'succeeded').gte('paid_at', lastMonthStart.toISOString()).lte('paid_at', lastMonthEnd.toISOString()),
      // Today payments
      supabase.from('payments').select('amount_cents, net_amount_cents, payment_intent_id').eq('status', 'succeeded').gte('paid_at', today.toISOString()),
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

    // Calculate NET revenue stats (after Stripe fees) by fetching balance_transaction data
    const totalRevenueCents = await calculateNetRevenue(stripe, paymentsAll.data || []);
    const monthlyRevenueCents = await calculateNetRevenue(stripe, paymentsThisMonth.data || []);
    const lastMonthRevenueCents = await calculateNetRevenue(stripe, paymentsLastMonth.data || []);
    const todayRevenueCents = await calculateNetRevenue(stripe, paymentsToday.data || []);

    const totalRevenue = totalRevenueCents / 100;
    const monthlyRevenue = monthlyRevenueCents / 100;
    const lastMonthRevenue = lastMonthRevenueCents / 100;
    const dailyRevenue = todayRevenueCents / 100;

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
    logger.error('Dashboard stats error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
