// Stripe webhook handler - processes checkout completions
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';
import { sendLoopsEvent, LOOPS_EVENTS } from '../../../lib/loops';

export const config = {
  api: {
    bodyParser: false, // Required for Stripe signature verification
  },
};

/**
 * Stripe webhook handler.
 *
 * Listens for completed checkout sessions and:
 * 1. Records payment in `payments` table
 * 2. Sets `has_paid = true` in `user_profiles`
 * 3. Creates initial `challenge_progress` for day 1
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting (lenient for webhooks)
  const identifier = getIdentifier(req);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.general, identifier);
  if (rateLimitResult) return rateLimitResult;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!stripeSecretKey || !webhookSecret) {
    logger.error('Missing Stripe configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // Buffer the raw body for signature verification
    const rawBody = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', (err) => reject(err));
    });
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // Retrieve full session with line items
      const checkout = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });

      // Check if this is a Trading Journal purchase - if so, skip (handled by journal-stripe webhook)
      if (checkout.metadata?.product === 'trading_journal') {
        logger.log('Skipping Trading Journal checkout - handled by journal webhook');
        return res.status(200).json({ received: true, skipped: 'trading_journal' });
      }

      // Validate the price ID - ENFORCE (reject mismatched prices)
      const lineItems = checkout.line_items?.data || [];
      const supabase = getServiceSupabase();

      // Fetch ALL valid price IDs (USD, EUR, GBP, etc.) from app_settings
      const { data: priceSettings, error: priceErr } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'stripe_price_id%');

      const validPriceIds = new Set();
      if (priceSettings) {
        priceSettings.forEach(s => validPriceIds.add(s.value));
      }
      // Also add env var price ID as fallback
      if (priceId) validPriceIds.add(priceId);

      // ENFORCE: Check if ANY line item matches a valid price ID
      // Coupons/discounts don't change the price ID, so we ALWAYS validate
      const validPurchase = lineItems.length >= 1 && lineItems.some(item => validPriceIds.has(item.price?.id));

      if (!validPurchase) {
        // Don't reject with 400 - just skip and return 200 to prevent Stripe retries
        // This handles other products (donations, other subscriptions) gracefully
        logger.log('Skipping: Price ID not recognized for course:', lineItems.map(i => i.price?.id));
        return res.status(200).json({ received: true, skipped: 'unrecognized_product' });
      }

      const userId = checkout.metadata?.userId;
      if (!userId) {
        logger.error('Missing userId in checkout metadata');
        return res.status(400).json({ error: 'Missing user ID in metadata' });
      }

      const now = new Date().toISOString();

      // Fetch net amount from Stripe balance_transaction
      let netAmountCents = null;
      const paymentIntentId = typeof checkout.payment_intent === 'string' ? checkout.payment_intent : null;

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          const balanceTransactionId = paymentIntent.charges?.data?.[0]?.balance_transaction;

          if (balanceTransactionId) {
            const balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransactionId);
            netAmountCents = balanceTransaction.net || null;
            logger.log(`Net amount for payment ${paymentIntentId}: ${netAmountCents} cents`);
          }
        } catch (err) {
          logger.error('Error fetching net amount from Stripe:', err.message);
          // Continue without net amount - we can backfill later
        }
      }

      // 1. Record payment in payments table - IDEMPOTENT (use upsert to handle retries)
      // Use stripe_session_id as unique key to prevent duplicate payments
      // SECURITY: Only store essential fields from checkout session (minimize PII exposure)
      const minimalCheckoutData = {
        id: checkout.id,
        customer: typeof checkout.customer === 'string' ? checkout.customer : null,
        payment_status: checkout.payment_status,
        amount_total: checkout.amount_total,
        currency: checkout.currency,
        created: checkout.created,
        mode: checkout.mode,
        // Omit: customer_details, customer_email, shipping, billing - reduces PII storage
      };

      const { error: paymentError } = await supabase.from('payments').upsert({
        user_id: userId,
        stripe_session_id: checkout.id,
        payment_intent_id: paymentIntentId,
        amount_cents: checkout.amount_total,
        net_amount_cents: netAmountCents,
        currency: checkout.currency || 'usd',
        status: 'succeeded',
        paid_at: now,
        raw: minimalCheckoutData,
      }, {
        onConflict: 'stripe_session_id', // Prevents duplicate payment records on webhook retry
        ignoreDuplicates: false, // Update if exists
      });

      if (paymentError) {
        logger.error('Error recording payment:', paymentError);
        // Continue anyway - user profile update is critical
      }

      // 2. Update user_profiles to set has_paid = true (CRITICAL!)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          has_paid: true,
          paid_at: now,
          stripe_customer_id: typeof checkout.customer === 'string' ? checkout.customer : null,
          last_payment_intent_id: typeof checkout.payment_intent === 'string' ? checkout.payment_intent : null,
        })
        .eq('id', userId);

      if (profileError) {
        logger.error('Error updating user profile, trying upsert:', profileError);
        // Fallback to upsert
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            has_paid: true,
            paid_at: now,
          }, { onConflict: 'id' });

        if (upsertError) {
          logger.error('CRITICAL: Failed to set has_paid:', upsertError);
          return res.status(500).json({ error: 'Failed to grant access' });
        }
      }

      // 3. Create initial progress for day 1 (only if course_content has day 1)
      const { data: day1Content } = await supabase
        .from('course_content')
        .select('day')
        .eq('day', 1)
        .maybeSingle();

      if (day1Content) {
        await supabase
          .from('challenge_progress')
          .upsert({
            user_id: userId,
            day: 1,
            unlocked: true,
          }, { onConflict: 'user_id,day' });
      }

      logger.log(`SUCCESS: Payment processed for user ${userId}, has_paid=true`);

      // 4. Store PromoteKit referral ID for affiliate tracking (if present)
      // PromoteKit tracks conversions client-side, but storing the referral ID
      // server-side provides a reliable backup for attribution reconciliation
      const promotekitReferral = checkout.metadata?.promotekit_referral;
      if (promotekitReferral) {
        const { error: refError } = await supabase
          .from('user_profiles')
          .update({ promotekit_referral_id: promotekitReferral })
          .eq('id', userId);

        if (refError) {
          // Non-critical: log but don't fail the webhook
          logger.error('Error storing PromoteKit referral ID:', refError.message);
        } else {
          logger.log(`PromoteKit referral ${promotekitReferral} stored for user ${userId}`);
        }
      }

      // 5. Fire Loops "challenge_welcome" event (non-blocking)
      const customerEmail = checkout.customer_details?.email || checkout.customer_email;
      if (customerEmail) {
        sendLoopsEvent(customerEmail, LOOPS_EVENTS.CHALLENGE_WELCOME, {
          userId,
        }).catch(err => logger.error('[LOOPS] challenge_welcome fire-and-forget error:', err));
      }

    } catch (err) {
      logger.error('Error processing checkout:', err);
      return res.status(500).json({ error: 'Processing error' });
    }
  }

  return res.status(200).json({ received: true });
}
