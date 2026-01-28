import Stripe from 'stripe';
import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API route: /api/checkout/stripe
 *
 * Creates a Stripe Checkout Session with multi-currency support.
 * Detects user's currency and uses the appropriate price ID.
 * Fallback to USD if currency is not configured.
 *
 * Supported currencies: USD, EUR, GBP, AUD, CAD, NZD
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Apply rate limiting
  const identifier = getIdentifier(req);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.payment, identifier);
  if (rateLimitResult) return rateLimitResult;

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

    // Get user's preferred currency and PromoteKit referral from request body
    const { currency = 'usd', promotekit_referral } = req.body;
    const currencyLower = currency.toLowerCase();

    // Supported currencies
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'aud', 'cad', 'nzd'];
    const selectedCurrency = supportedCurrencies.includes(currencyLower) ? currencyLower : 'usd';

    // Fetch price ID for selected currency from database
    const supabase = getServiceSupabase();
    const priceIdKey = `stripe_price_id_${selectedCurrency}`;

    let priceId = null;
    try {
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', priceIdKey)
        .maybeSingle();

      if (setting?.value) {
        priceId = setting.value;
      }
    } catch (err) {
      logger.error(`Error fetching ${priceIdKey}:`, err);
    }

    // Fallback to USD if selected currency price not found
    if (!priceId && selectedCurrency !== 'usd') {
      logger.log(`Price for ${selectedCurrency} not found, falling back to USD`);
      try {
        const { data: usdSetting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'stripe_price_id_usd')
          .maybeSingle();

        if (usdSetting?.value) {
          priceId = usdSetting.value;
        }
      } catch (err) {
        // Try legacy stripe_price_id key
        const { data: legacySetting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'stripe_price_id')
          .maybeSingle();

        if (legacySetting?.value) {
          priceId = legacySetting.value;
        }
      }
    }

    // Final fallback to env variable
    if (!priceId) {
      priceId = process.env.STRIPE_PRICE_ID || '';
    }

    if (!priceId || !priceId.startsWith('price_')) {
      return res.status(500).json({ error: 'Invalid price configuration' });
    }

    // Use trusted domain for redirect URLs (not client-controlled origin header)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
      success_url: `${appUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
      metadata: {
        userId,
        selectedCurrency,
        // PromoteKit referral ID for affiliate attribution
        ...(promotekit_referral && { promotekit_referral }),
      },
    });

    return res.status(200).json({
      id: session.id,
      url: session.url, // Return the checkout URL for templates without Stripe.js
      currency: selectedCurrency,
      priceId,
    });
  } catch (err) {
    logger.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}