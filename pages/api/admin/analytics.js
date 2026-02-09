import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';
import Stripe from 'stripe';

/**
 * API route: /api/admin/analytics
 *
 * Returns time-series data for the admin analytics dashboard:
 * - Daily revenue (last 30 days) — gross, net, and Stripe fees
 * - Monthly revenue (last 12 months) — gross, net, and Stripe fees
 * - Daily user signups (last 30 days)
 * - Income summary: total gross, total net, total Stripe fees, affiliate commissions
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe configuration missing' });
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Fetch all data in parallel
    const [
      paymentsLast30,
      paymentsLast12Months,
      usersLast30,
      allUsers,
      affiliateCommissions,
    ] = await Promise.all([
      // Payments last 30 days for daily chart
      supabase
        .from('payments')
        .select('amount_cents, net_amount_cents, payment_intent_id, paid_at')
        .eq('status', 'succeeded')
        .gte('paid_at', thirtyDaysAgo.toISOString())
        .order('paid_at', { ascending: true }),

      // Payments last 12 months for monthly chart
      supabase
        .from('payments')
        .select('amount_cents, net_amount_cents, payment_intent_id, paid_at')
        .eq('status', 'succeeded')
        .gte('paid_at', twelveMonthsAgo.toISOString())
        .order('paid_at', { ascending: true }),

      // User signups last 30 days
      supabase
        .from('user_profiles')
        .select('created_at, has_paid')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true }),

      // All users for totals
      supabase
        .from('user_profiles')
        .select('has_paid'),

      // Affiliate commissions (all time)
      supabase
        .from('affiliate_commissions')
        .select('amount_cents, status, created_at'),
    ]);

    // --- Resolve net amounts for payments missing net_amount_cents ---
    async function resolveNetAmount(payment) {
      if (payment.net_amount_cents != null) {
        return { gross: payment.amount_cents, net: payment.net_amount_cents };
      }
      // Fallback to Stripe API for old payments
      if (payment.payment_intent_id) {
        try {
          const pi = await stripe.paymentIntents.retrieve(payment.payment_intent_id);
          if (pi.charges?.data?.[0]?.balance_transaction) {
            const bt = await stripe.balanceTransactions.retrieve(pi.charges.data[0].balance_transaction);
            return { gross: payment.amount_cents, net: bt.net || payment.amount_cents };
          }
        } catch (e) {
          // Fall through
        }
      }
      return { gross: payment.amount_cents, net: payment.amount_cents };
    }

    // --- Build daily revenue (last 30 days) ---
    const dailyRevenue = {};
    // Pre-fill all 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyRevenue[key] = { date: key, gross: 0, net: 0, fees: 0, count: 0 };
    }

    const payments30 = paymentsLast30.data || [];
    const resolvedDaily = await Promise.all(payments30.map(p => resolveNetAmount(p)));

    payments30.forEach((p, i) => {
      const key = p.paid_at?.split('T')[0];
      if (key && dailyRevenue[key]) {
        const { gross, net } = resolvedDaily[i];
        dailyRevenue[key].gross += gross;
        dailyRevenue[key].net += net;
        dailyRevenue[key].fees += (gross - net);
        dailyRevenue[key].count += 1;
      }
    });

    const dailyRevenueArr = Object.values(dailyRevenue).map(d => ({
      ...d,
      gross: Math.round(d.gross) / 100,
      net: Math.round(d.net) / 100,
      fees: Math.round(d.fees) / 100,
    }));

    // --- Build monthly revenue (last 12 months) ---
    const monthlyRevenue = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = { month: key, gross: 0, net: 0, fees: 0, count: 0 };
    }

    const payments12 = paymentsLast12Months.data || [];
    const resolvedMonthly = await Promise.all(payments12.map(p => resolveNetAmount(p)));

    payments12.forEach((p, i) => {
      if (!p.paid_at) return;
      const d = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyRevenue[key]) {
        const { gross, net } = resolvedMonthly[i];
        monthlyRevenue[key].gross += gross;
        monthlyRevenue[key].net += net;
        monthlyRevenue[key].fees += (gross - net);
        monthlyRevenue[key].count += 1;
      }
    });

    const monthlyRevenueArr = Object.values(monthlyRevenue).map(d => ({
      ...d,
      gross: Math.round(d.gross) / 100,
      net: Math.round(d.net) / 100,
      fees: Math.round(d.fees) / 100,
    }));

    // --- Build daily user signups (last 30 days) ---
    const dailyUsers = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyUsers[key] = { date: key, total: 0, paid: 0 };
    }

    (usersLast30.data || []).forEach(u => {
      const key = u.created_at?.split('T')[0];
      if (key && dailyUsers[key]) {
        dailyUsers[key].total += 1;
        if (u.has_paid) dailyUsers[key].paid += 1;
      }
    });

    const dailyUsersArr = Object.values(dailyUsers);

    // --- Income summary ---
    // All-time totals from 12-month data
    const totalGross12 = monthlyRevenueArr.reduce((s, m) => s + m.gross, 0);
    const totalNet12 = monthlyRevenueArr.reduce((s, m) => s + m.net, 0);
    const totalFees12 = monthlyRevenueArr.reduce((s, m) => s + m.fees, 0);

    // Affiliate commissions
    const commissions = affiliateCommissions.data || [];
    const totalAffiliateCommissions = commissions
      .filter(c => c.status === 'paid' || c.status === 'approved')
      .reduce((s, c) => s + (c.amount_cents || 0), 0) / 100;

    // User totals
    const allUsersData = allUsers.data || [];
    const totalUsersCount = allUsersData.length;
    const paidUsersCount = allUsersData.filter(u => u.has_paid).length;

    return res.status(200).json({
      dailyRevenue: dailyRevenueArr,
      monthlyRevenue: monthlyRevenueArr,
      dailyUsers: dailyUsersArr,
      summary: {
        totalGross12Months: Math.round(totalGross12 * 100) / 100,
        totalNet12Months: Math.round(totalNet12 * 100) / 100,
        totalFees12Months: Math.round(totalFees12 * 100) / 100,
        totalAffiliateCommissions: Math.round(totalAffiliateCommissions * 100) / 100,
        netAfterAll: Math.round((totalNet12 - totalAffiliateCommissions) * 100) / 100,
        totalUsers: totalUsersCount,
        paidUsers: paidUsersCount,
        conversionRate: totalUsersCount > 0
          ? Math.round((paidUsersCount / totalUsersCount) * 1000) / 10
          : 0,
      },
    });
  } catch (err) {
    logger.error('Analytics API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
