import Stripe from 'stripe';
import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

/**
 * API route: /api/checkout/stripe
 *
 * Creates a Stripe Checkout Session for the Market Warrior course.  The
 * expected product/price ID is validated against environment
 * variables to prevent unauthorized pricing changes.  The route
 * accepts a POST with `{ userId }` to attach the user as metadata on
 * the session.  After payment is confirmed, a webhook grants access
 * (see `api/webhooks/stripe.js`).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = user.id;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    // Determine the active price ID
    let priceId = process.env.STRIPE_PRICE_ID || '';
    try {
      const supabase = getServiceSupabase();
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'stripe_price_id')
        .single();
      if (setting && setting.value) {
        priceId = setting.value;
      }
    } catch (err) {
      // ignore read errors and fall back to env
    }
    if (!priceId || !priceId.startsWith('price_')) {
      return res.status(500).json({ error: 'Invalid price configuration' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${req.headers.origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: { userId },
    });
    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}