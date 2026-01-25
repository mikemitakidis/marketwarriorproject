import Stripe from 'stripe';
import { getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API route: /api/admin/coupons
 *
 * GET: Fetch all promotion codes from Stripe (read-only display)
 *
 * Returns promotion codes with expanded coupon data for discount details.
 * All coupon management (create/edit/delete) is done in Stripe Dashboard.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY: Verify admin authorization
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

    // Check Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    // Fetch promotion codes from Stripe with expanded coupon data
    // We fetch both active and inactive to show full list
    const [activePromos, inactivePromos] = await Promise.all([
      stripe.promotionCodes.list({
        limit: 100,
        active: true,
        expand: ['data.coupon'],
      }),
      stripe.promotionCodes.list({
        limit: 100,
        active: false,
        expand: ['data.coupon'],
      }),
    ]);

    // Combine and format the promotion codes
    const allPromos = [...activePromos.data, ...inactivePromos.data];

    const formattedCoupons = allPromos.map((promo) => {
      const coupon = promo.coupon;

      // Determine discount display
      let discount = '';
      if (coupon.percent_off) {
        discount = `${coupon.percent_off}%`;
      } else if (coupon.amount_off) {
        // Convert from cents to dollars/currency
        const amount = (coupon.amount_off / 100).toFixed(2);
        discount = `${coupon.currency?.toUpperCase() || 'USD'} ${amount}`;
      }

      // Determine expiry status
      let expiresAt = null;
      let isExpired = false;
      if (promo.expires_at) {
        expiresAt = new Date(promo.expires_at * 1000).toISOString();
        isExpired = new Date(promo.expires_at * 1000) < new Date();
      }

      return {
        id: promo.id,
        code: promo.code,
        discount,
        duration: coupon.duration, // 'once', 'repeating', 'forever'
        durationInMonths: coupon.duration_in_months || null,
        timesRedeemed: promo.times_redeemed || 0,
        maxRedemptions: promo.max_redemptions || null, // null means unlimited
        expiresAt,
        isExpired,
        active: promo.active,
        created: new Date(promo.created * 1000).toISOString(),
        // Additional coupon metadata
        couponName: coupon.name || null,
        couponId: coupon.id,
      };
    });

    // Sort by created date (newest first)
    formattedCoupons.sort((a, b) => new Date(b.created) - new Date(a.created));

    return res.status(200).json({
      coupons: formattedCoupons,
      total: formattedCoupons.length,
    });

  } catch (err) {
    logger.error('Admin coupons error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch coupons' });
  }
}
