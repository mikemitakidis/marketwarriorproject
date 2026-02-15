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

    // Fetch price ID for selected currency from database
    const supabase = getServiceSupabase();
    const priceIdKey = `stripe_price_id_${selectedCurrency}`;

    let priceId = null;
    let priceSource = 'none';
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

    // Fallback to USD if selected currency price not found
    if (!priceId && selectedCurrency !== 'usd') {
      console.error(`[CHECKOUT] Price for ${selectedCurrency} not found, falling back to USD`);
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
        // Try legacy stripe_price_id key
        const { data: legacySetting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'stripe_price_id')
          .maybeSingle();

        if (legacySetting?.value) {
          priceId = legacySetting.value;
          priceSource = 'db:stripe_price_id (legacy)';
        }
      }
    }

    // Final fallback to env variable
    if (!priceId) {
      priceId = process.env.STRIPE_PRICE_ID || '';
      if (priceId) priceSource = 'env:STRIPE_PRICE_ID';
    }

    console.error(`[CHECKOUT] Resolved priceId=${priceId} from ${priceSource}, keyMode=${keyMode}`);

    // Validate price ID format
    if (!priceId || !priceId.startsWith('price_')) {
      console.error(`[CHECKOUT] INVALID price config: priceId="${priceId}", source=${priceSource}`);
      return res.status(500).json({ error: 'Invalid price configuration. Please contact support.' });
    }

    // Detect potential mode mismatch (test price with live key or vice versa)
    if (keyMode === 'LIVE' && priceId.includes('_test_')) {
      console.error(`[CHECKOUT] WARNING: Using TEST price ID with LIVE Stripe key!`);
    } else if (keyMode === 'TEST' && !priceId.includes('_test_')) {
      console.error(`[CHECKOUT] WARNING: Using LIVE price ID with TEST Stripe key!`);
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