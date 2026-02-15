/**
 * Journal Checkout Session API
 *
 * Creates a Stripe Checkout Session for Trading Journal purchase.
 * The metadata is used by the webhook to identify the journal user.
 *
 * Price resolution (in order):
 *  1. STRIPE_JOURNAL_PRODUCT_ID env var → dynamically fetch active price from Stripe
 *  2. STRIPE_JOURNAL_PRICE_ID env var (legacy static fallback)
 *
 * Using the product ID approach means you can freely change prices in the
 * Stripe Dashboard without ever updating env vars.
 */
import Stripe from 'stripe';
import { getJournalUser, getServiceSupabase, getJournalSettings } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth check
    const user = await getJournalUser(req, res);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Rate limit
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    // Check if paid mode is enabled — if not, block checkout creation
    const journalSettings = await getJournalSettings();
    if (!journalSettings.paidEnabled) {
      return res.status(400).json({
        error: 'Paid mode is not enabled. The Trading Journal is currently free.',
      });
    }

    // Check if user already paid
    if (user.hasPaid) {
      return res.status(400).json({ error: 'You already have access to the Trading Journal' });
    }

    // Get Stripe config
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.marketwarrior.club';

    if (!stripeSecretKey) {
      console.error('[JOURNAL-CHECKOUT] Missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Determine mode based on price type (one-time vs recurring)
    const { productType = 'lifetime' } = req.body || {};
    const mode = productType === 'subscription' ? 'subscription' : 'payment';

    // ── Price resolution ────────────────────────────────────────────
    let priceId = null;
    let priceSource = 'none';

    // Strategy 1: Product-based dynamic lookup (preferred)
    const journalProductId = process.env.STRIPE_JOURNAL_PRODUCT_ID;
    if (journalProductId) {
      try {
        const prices = await stripe.prices.list({
          product: journalProductId,
          active: true,
          limit: 1,
        });
        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
          priceSource = `product:${journalProductId}`;
        } else {
          console.error(`[JOURNAL-CHECKOUT] No active price on product ${journalProductId}`);
        }
      } catch (err) {
        console.error('[JOURNAL-CHECKOUT] Product price lookup failed:', err.message);
      }
    }

    // Strategy 2: Static price ID from env var (legacy fallback)
    if (!priceId) {
      priceId = process.env.STRIPE_JOURNAL_PRICE_ID || '';
      if (priceId) priceSource = 'env:STRIPE_JOURNAL_PRICE_ID';
    }

    console.error(`[JOURNAL-CHECKOUT] priceId=${priceId} from ${priceSource}, user=${user.id}`);

    if (!priceId || !priceId.startsWith('price_')) {
      console.error('[JOURNAL-CHECKOUT] No valid price ID configured');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode,
      success_url: `${appUrl}/trading-journal?success=true`,
      cancel_url: `${appUrl}/trading-journal?canceled=true`,
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        product: 'trading_journal',      // REQUIRED - webhook checks this
        journalUserId: user.id,          // REQUIRED - the journal_users.id
        productType,                      // 'subscription', 'lifetime', 'one_time'
      },
      allow_promotion_codes: true,
    });

    console.error(`[JOURNAL-CHECKOUT] Session created: ${session.id} for user ${user.id}`);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (err) {
    console.error('[JOURNAL-CHECKOUT] Error:', err?.message || err);
    if (err?.type === 'StripeInvalidRequestError') {
      console.error(`[JOURNAL-CHECKOUT] Stripe details: code=${err.code}, param=${err.param}`);
      if (err.code === 'resource_missing' && err.param?.includes('price')) {
        return res.status(500).json({ error: 'Payment configuration error. The site owner has been notified.' });
      }
    }
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
