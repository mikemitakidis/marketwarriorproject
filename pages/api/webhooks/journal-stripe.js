/**
 * Stripe webhook handler for Trading Journal payments
 *
 * SEPARATE from course payments - handles journal subscriptions/purchases.
 * Listens for checkout.session.completed events and:
 * 1. Records payment in `journal_payments` table
 * 2. Sets `has_paid = true` in `journal_users`
 */
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/journalAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

export const config = {
  api: {
    bodyParser: false, // Required for Stripe signature verification
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting (lenient for webhooks)
  const identifier = getIdentifier(req);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.general, identifier);
  if (rateLimitResult) return rateLimitResult;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  // Use separate webhook secret for journal if configured, fallback to main secret
  const webhookSecret = process.env.STRIPE_JOURNAL_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    logger.error('Missing Stripe configuration for journal webhook');
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
    logger.error('Journal webhook signature verification failed:', err.message);
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

      // Check if this is a journal payment (via metadata)
      const isJournalPayment = checkout.metadata?.product === 'trading_journal';
      const journalUserId = checkout.metadata?.journalUserId;

      if (!isJournalPayment || !journalUserId) {
        // Not a journal payment - ignore (let the main webhook handle it)
        logger.log('Ignoring non-journal payment in journal webhook');
        return res.status(200).json({ received: true, ignored: true });
      }

      const supabase = getServiceSupabase();
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
          }
        } catch (err) {
          logger.error('Error fetching net amount from Stripe:', err.message);
        }
      }

      // 1. Record payment in journal_payments table (IDEMPOTENT)
      const { error: paymentError } = await supabase.from('journal_payments').upsert({
        journal_user_id: journalUserId,
        stripe_checkout_session_id: checkout.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: typeof checkout.customer === 'string' ? checkout.customer : null,
        amount_cents: checkout.amount_total || 0,
        currency: checkout.currency || 'usd',
        status: 'completed',
        product_type: checkout.metadata?.productType || 'subscription',
        completed_at: now,
      }, {
        onConflict: 'stripe_checkout_session_id',
        ignoreDuplicates: false,
      });

      if (paymentError) {
        logger.error('Error recording journal payment:', paymentError);
        // Continue anyway - user update is critical
      }

      // 2. Update journal_users to set has_paid = true (CRITICAL!)
      const { error: userError } = await supabase
        .from('journal_users')
        .update({
          has_paid: true,
          paid_at: now,
        })
        .eq('id', journalUserId);

      if (userError) {
        logger.error('CRITICAL: Failed to set journal user has_paid:', userError);
        return res.status(500).json({ error: 'Failed to grant journal access' });
      }

      logger.log(`SUCCESS: Journal payment processed for user ${journalUserId}, has_paid=true`);

    } catch (err) {
      logger.error('Error processing journal checkout:', err);
      return res.status(500).json({ error: 'Processing error' });
    }
  }

  // Handle refunds
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;

    try {
      const supabase = getServiceSupabase();

      // Find the payment by payment_intent_id
      const { data: payment } = await supabase
        .from('journal_payments')
        .select('id, journal_user_id')
        .eq('stripe_payment_intent_id', charge.payment_intent)
        .maybeSingle();

      if (payment) {
        // Update payment status
        await supabase
          .from('journal_payments')
          .update({ status: 'refunded' })
          .eq('id', payment.id);

        // Revoke access
        await supabase
          .from('journal_users')
          .update({ has_paid: false })
          .eq('id', payment.journal_user_id);

        logger.log(`Journal payment refunded for user ${payment.journal_user_id}`);
      }
    } catch (err) {
      logger.error('Error processing journal refund:', err);
    }
  }

  return res.status(200).json({ received: true });
}
