import Stripe from 'stripe';
import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API route: /api/checkout/stripe
 *
 * Creates a Stripe Checkout Session with multi-currency support.
 *
 * Price resolution (in order):
 *  1. Fetch product ID from app_settings (key: stripe_product_id) or env STRIPE_PRODUCT_ID
 *     → dynamically look up the active Stripe price for the user's currency
 *  2. Fallback: static price IDs from app_settings (stripe_price_id_{currency})
 *  3. Fallback: STRIPE_PRICE_ID env var
 *
 * Using the product ID approach means you can freely change prices in the
 * Stripe Dashboard without ever updating your database or env vars.
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
      console.error('[CHECKOUT] STRIPE_SECRET_KEY is not set');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    // Log Stripe key mode for diagnostics
    const keyMode = stripeSecretKey.startsWith('sk_live_') ? 'LIVE' : stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN';
    console.error(`[CHECKOUT] Stripe key mode: ${keyMode}, user: ${userId}`);

    // SECURITY: Prevent double payment — check if user already has active course access
    const supabaseCheck = getServiceSupabase();
    const { data: profile, error: profileErr } = await supabaseCheck
      .from('user_profiles')
      .select('has_paid, access_revoked_at')
      .eq('id', userId)
      .maybeSingle();

    // Profile might not exist yet for new OAuth users - that's OK, let them pay
    if (profileErr) {
      console.error('[CHECKOUT] Profile check error (non-fatal):', profileErr.message);
    }

    if (profile?.has_paid && !profile?.access_revoked_at) {
      return res.status(400).json({ error: 'You already have active access to the course.' });
    }

    // Get user's preferred currency and PromoteKit referral from request body
    const { currency = 'usd', promotekit_referral } = req.body || {};
    const currencyLower = currency.toLowerCase();

    // Supported currencies
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'aud', 'cad', 'nzd'];
    const selectedCurrency = supportedCurrencies.includes(currencyLower) ? currencyLower : 'usd';

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = getServiceSupabase();

    let priceId = null;
    let priceSource = 'none';

    // ── Strategy 1: Product-based dynamic price lookup ──────────────
    // This is the preferred method — product IDs never change when you
    // edit prices in Stripe Dashboard.
    let productId = process.env.STRIPE_PRODUCT_ID || null;
    if (!productId) {
      try {
        const { data: prodSetting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'stripe_product_id')
          .maybeSingle();
        if (prodSetting?.value) productId = prodSetting.value;
      } catch (err) {
        console.error('[CHECKOUT] Error fetching stripe_product_id:', err.message);
      }
    }

    if (productId) {
      try {
        // Look up the active price for the user's currency on this product
        const prices = await stripe.prices.list({
          product: productId,
          active: true,
          currency: selectedCurrency,
          limit: 1,
        });

        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
          priceSource = `product:${productId}/${selectedCurrency}`;
        } else if (selectedCurrency !== 'usd') {
          // Fallback: try USD price on the same product
          const usdPrices = await stripe.prices.list({
            product: productId,
            active: true,
            currency: 'usd',
            limit: 1,
          });
          if (usdPrices.data.length > 0) {
            priceId = usdPrices.data[0].id;
            priceSource = `product:${productId}/usd (fallback)`;
          }
        }

        if (priceId) {
          console.error(`[CHECKOUT] Dynamic price resolved: ${priceId} from ${priceSource}`);
        } else {
          console.error(`[CHECKOUT] No active price found on product ${productId} for ${selectedCurrency} or usd`);
        }
      } catch (err) {
        console.error(`[CHECKOUT] Product price lookup failed:`, err.message);
      }
    }

    // ── Strategy 2: Static price IDs from app_settings (legacy) ─────
    if (!priceId) {
      const priceIdKey = `stripe_price_id_${selectedCurrency}`;
      try {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', priceIdKey)
          .maybeSingle();

        if (setting?.value) {
          priceId = setting.value;
          priceSource = `db:${priceIdKey}`;
        }
      } catch (err) {
        console.error(`[CHECKOUT] Error fetching ${priceIdKey}:`, err.message);
      }

      // Fallback to USD static price
      if (!priceId && selectedCurrency !== 'usd') {
        try {
          const { data: usdSetting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'stripe_price_id_usd')
            .maybeSingle();

          if (usdSetting?.value) {
            priceId = usdSetting.value;
            priceSource = 'db:stripe_price_id_usd';
          }
        } catch (err) {
          // noop
        }
      }
    }

    // ── Strategy 3: Env var fallback ────────────────────────────────
    if (!priceId) {
      priceId = process.env.STRIPE_PRICE_ID || '';
      if (priceId) priceSource = 'env:STRIPE_PRICE_ID';
    }

    console.error(`[CHECKOUT] Final priceId=${priceId} from ${priceSource}, keyMode=${keyMode}`);

    if (!priceId || !priceId.startsWith('price_')) {
      console.error(`[CHECKOUT] INVALID price config: priceId="${priceId}", source=${priceSource}`);
      return res.status(500).json({ error: 'Invalid price configuration. Please contact support.' });
    }

    // Use trusted domain for redirect URLs (not client-controlled origin header)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
    // Use console.error directly — logger.error drops objects in production
    console.error('[CHECKOUT] Stripe checkout error:', err?.message || err);
    if (err?.type === 'StripeInvalidRequestError') {
      console.error(`[CHECKOUT] Stripe details: code=${err.code}, param=${err.param}, statusCode=${err.statusCode}`);
      // Give a more helpful error for known issues
      if (err.code === 'resource_missing' && err.param?.includes('price')) {
        console.error(`[CHECKOUT] CRITICAL: Price ID does not exist in Stripe. Check app_settings table and Stripe Dashboard.`);
        return res.status(500).json({ error: 'Payment configuration error. The site owner has been notified.' });
      }
    }
    console.error('[CHECKOUT] Full error type:', err?.type, 'stack:', err?.stack?.split('\n')[0]);
    return res.status(500).json({ error: 'Payment initialization failed. Please try again.' });
  }
}