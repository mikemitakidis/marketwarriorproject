import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../../lib/ratelimit';
import logger from '../../../../lib/logger';
import Stripe from 'stripe';

/**
 * Admin API: /api/admin/settings/sync-stripe-prices
 *
 * POST: Sync existing Stripe prices to the database
 *
 * This endpoint fetches all active prices from the Stripe product and
 * stores them in the app_settings table. This is useful when prices
 * were manually created in Stripe dashboard and need to be synced.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY: Verify admin authorization
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Apply rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = getServiceSupabase();

    // Get product ID
    let productId = process.env.STRIPE_PRODUCT_ID;
    if (!productId) {
      const { data: productSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'stripe_product_id')
        .maybeSingle();
      productId = productSetting?.value;
    }

    if (!productId) {
      return res.status(500).json({ error: 'Stripe product ID not configured' });
    }

    // Fetch all active prices for the product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });

    if (!prices.data || prices.data.length === 0) {
      return res.status(404).json({ error: 'No active prices found for product' });
    }

    // Supported currencies
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'aud', 'cad', 'nzd'];
    const syncedPrices = {};
    const settingsToUpdate = [];

    // Find the best price for each currency (prefer prices marked as default or with specific nicknames)
    for (const currency of supportedCurrencies) {
      const currencyPrices = prices.data.filter(p => p.currency === currency);

      if (currencyPrices.length > 0) {
        // Prefer price with "Challenge Price" in nickname, otherwise use the first one
        let selectedPrice = currencyPrices.find(p =>
          p.nickname?.toLowerCase().includes('challenge') ||
          p.metadata?.is_default === 'true'
        );

        if (!selectedPrice) {
          // Sort by created date descending and pick the newest
          currencyPrices.sort((a, b) => b.created - a.created);
          selectedPrice = currencyPrices[0];
        }

        syncedPrices[currency] = {
          priceId: selectedPrice.id,
          amount: selectedPrice.unit_amount / 100,
          nickname: selectedPrice.nickname,
        };

        settingsToUpdate.push({
          key: `stripe_price_id_${currency}`,
          value: selectedPrice.id,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });

        logger.log(`Synced ${currency.toUpperCase()}: ${selectedPrice.id} (${selectedPrice.unit_amount / 100})`);
      }
    }

    // Also set the legacy stripe_price_id to USD price
    if (syncedPrices.usd) {
      settingsToUpdate.push({
        key: 'stripe_price_id',
        value: syncedPrices.usd.priceId,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
    }

    // Save to database
    if (settingsToUpdate.length > 0) {
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });

      if (upsertError) {
        logger.error('Error syncing prices:', upsertError);
        return res.status(500).json({ error: 'Failed to sync prices to database' });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${Object.keys(syncedPrices).length} currency prices from Stripe`,
      syncedPrices,
    });

  } catch (err) {
    logger.error('Sync Stripe prices error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
