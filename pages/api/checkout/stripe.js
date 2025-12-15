import Stripe from 'stripe';
import { getUserFromJwt } from '../../../lib/auth';

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
    const user = await getUserFromJwt(req);
    const userId = user.id;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!stripeSecretKey || !priceId) {
      return res.status(500).json({ error: 'Stripe is not configured' });
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
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: { userId },
    });
    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
}