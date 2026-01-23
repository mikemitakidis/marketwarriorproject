// Stripe webhook handler - processes checkout completions
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

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

      // Validate the price ID (optional - log but don't block)
      const lineItems = checkout.line_items?.data || [];
      let expectedPriceId = priceId;

      const supabase = getServiceSupabase();

      // Try to get price ID from app_settings
      try {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'stripe_price_id')
          .single();
        if (setting?.value) expectedPriceId = setting.value;
      } catch (e) {
        // Use env var if can't fetch from DB
      }

      // Log validation but don't block payment processing
      const validPurchase = lineItems.length >= 1 && lineItems.some(item => item.price?.id === expectedPriceId);
      if (!validPurchase && expectedPriceId) {
        logger.warn('Price ID mismatch - processing anyway:', lineItems.map(i => i.price?.id));
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

      // 1. Record payment in payments table (using CORRECT column names from schema!)
      const { error: paymentError } = await supabase.from('payments').insert({
        user_id: userId,
        stripe_session_id: checkout.id,
        payment_intent_id: paymentIntentId,
        amount_cents: checkout.amount_total,
        net_amount_cents: netAmountCents,
        currency: checkout.currency || 'usd',
        status: 'succeeded',
        paid_at: now,
        raw: checkout,
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

    } catch (err) {
      logger.error('Error processing checkout:', err);
      return res.status(500).json({ error: 'Processing error' });
    }
  }

  return res.status(200).json({ received: true });
}
