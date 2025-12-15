import { buffer } from 'micro';
import Stripe from 'stripe';
import { getServiceSupabase } from '../../../lib/supabase';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Stripe webhook handler.
 *
 * Listens for completed checkout sessions and grants access to the
 * course by inserting a record into the `payments` table and
 * creating the initial `challenge_progress` rows.  This endpoint
 * verifies the webhook signature to ensure authenticity and checks
 * that the product purchased matches the expected price ID.
 */
export default async function handler(req, res) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_ID;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Retrieve session with line_items to validate price
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    let checkout;
    try {
      checkout = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
    } catch (err) {
      console.error('Failed to retrieve checkout session', err);
      return res.status(400).json({ error: 'Invalid session' });
    }
    const lineItems = checkout.line_items?.data || [];
    const expectedPriceId = priceId;
    // Validate that only our expected price was purchased
    const validPurchase = lineItems.length === 1 && lineItems[0].price?.id === expectedPriceId;
    if (!validPurchase) {
      console.error('Unexpected price id', lineItems);
      return res.status(400).json({ error: 'Unexpected product or price' });
    }
    const metadataUserId = checkout.metadata?.userId;
    if (!metadataUserId) {
      return res.status(400).json({ error: 'Missing user ID in metadata' });
    }
    const supabase = getServiceSupabase();
    // Record payment with start and expiry
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await supabase.from('payments').insert({
      user_id: metadataUserId,
      session_id: checkout.id,
      amount: checkout.amount_total,
      currency: checkout.currency,
      has_paid: true,
      challenge_start_date: now.toISOString(),
      access_expires_at: expires.toISOString(),
    });
    // Upsert user profile (set has_paid and challenge_start_date if not exists)
    await supabase
      .from('user_profiles')
      .upsert({ id: metadataUserId, has_paid: true, challenge_start_date: now.toISOString() }, { onConflict: 'id' });
    // Grant access: create progress rows for day 1 with immediate availability
    await supabase.from('challenge_progress').upsert({ user_id: metadataUserId, day: 1, available_at: now.toISOString() }, { onConflict: 'user_id,day' });
    // Do not prepopulate other days; progress will be inserted as user completes tasks
  }
  res.status(200).json({ received: true });
}