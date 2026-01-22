import Stripe from 'stripe';
import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';

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

    // Get user's preferred currency from request body (or detect from location)
    const { currency = 'usd' } = req.body;
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
      console.error(`Error fetching ${priceIdKey}:`, err);
    }

    // Fallback to USD if selected currency price not found
    if (!priceId && selectedCurrency !== 'usd') {
      console.log(`Price for ${selectedCurrency} not found, falling back to USD`);
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
      metadata: {
        userId,
        selectedCurrency,
      },
    });

    return res.status(200).json({
      id: session.id,
      currency: selectedCurrency,
      priceId,
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}