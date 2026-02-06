/**
 * Journal Checkout Session API
 *
 * Creates a Stripe Checkout Session for Trading Journal purchase.
 * The metadata is used by the webhook to identify the journal user.
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
    const priceId = process.env.STRIPE_JOURNAL_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.marketwarrior.club';

    if (!stripeSecretKey) {
      logger.error('Missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    if (!priceId) {
      logger.error('Missing STRIPE_JOURNAL_PRICE_ID');
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Determine mode based on price type (one-time vs recurring)
    // You can also pass this from the request body if you have multiple options
    const { productType = 'lifetime' } = req.body;

    // For subscriptions, use mode: 'subscription'
    // For one-time payments, use mode: 'payment'
    const mode = productType === 'subscription' ? 'subscription' : 'payment';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode,
      success_url: `${appUrl}/trading-journal?success=true`,
      cancel_url: `${appUrl}/trading-journal?canceled=true`,
      customer_email: user.email, // Pre-fill email
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
      // Allow promotion codes (optional)
      allow_promotion_codes: true,
    });

    logger.log(`Checkout session created for journal user ${user.id}: ${session.id}`);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (err) {
    logger.error('Create checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
