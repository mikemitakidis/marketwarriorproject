import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../../lib/serverAuth';
import Stripe from 'stripe';

/**
 * Admin API: /api/admin/settings/general
 *
 * GET: Fetch all general settings
 * POST: Update general settings (price, logo, site name, support email, access duration)
 */
export default async function handler(req, res) {
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

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      // Fetch all settings from app_settings table
      const { data: settingsData, error: fetchError } = await supabase
        .from('app_settings')
        .select('key, value');

      if (fetchError) {
        console.error('Error fetching settings:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }

      // Convert array to object
      const settings = {};
      (settingsData || []).forEach(row => {
        settings[row.key] = row.value;
      });

      // Return settings with defaults
      return res.status(200).json({
        challengePrice: settings.challenge_price || '39.99',
        stripePriceId: settings.stripe_price_id || '',
        stripePriceIdUsd: settings.stripe_price_id_usd || '',
        stripePriceIdEur: settings.stripe_price_id_eur || '',
        stripePriceIdGbp: settings.stripe_price_id_gbp || '',
        stripePriceIdAud: settings.stripe_price_id_aud || '',
        stripePriceIdCad: settings.stripe_price_id_cad || '',
        stripePriceIdNzd: settings.stripe_price_id_nzd || '',
        siteName: settings.site_name || 'Market Warrior Challenge',
        supportEmail: settings.support_email || 'support@marketwarrior.club',
        accessDuration: settings.access_duration || 120,
        logoUrl: settings.logo_url || '',
        faviconUrl: settings.favicon_url || '',
      });
    }

    if (req.method === 'POST') {
      const {
        challengePrice,
        siteName,
        supportEmail,
        accessDuration,
        logoUrl,
        faviconUrl,
      } = req.body;

      // Validate inputs
      if (challengePrice && (isNaN(parseFloat(challengePrice)) || parseFloat(challengePrice) < 0)) {
        return res.status(400).json({ error: 'Invalid price' });
      }

      if (accessDuration && (isNaN(parseInt(accessDuration)) || parseInt(accessDuration) < 1)) {
        return res.status(400).json({ error: 'Invalid access duration' });
      }

      // Initialize Stripe if price is being updated
      let newPriceIds = {};
      if (challengePrice) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          return res.status(500).json({ error: 'Stripe not configured' });
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

        // Get product ID from env or create one
        let productId = process.env.STRIPE_PRODUCT_ID;

        if (!productId) {
          // Try to get from settings
          const { data: productSetting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'stripe_product_id')
            .maybeSingle();

          productId = productSetting?.value;
        }

        // If still no product ID, error out
        if (!productId) {
          return res.status(500).json({
            error: 'Stripe product ID not configured. Please run migration: sql/migrations/2026-01-22_set_correct_stripe_product_id.sql'
          });
        }

        console.log(`Using Stripe product: ${productId}`);

        // Conversion rates from USD to other currencies
        // NOTE: These are approximate rates. Stripe will handle the actual payment processing.
        // You can manually adjust these in Stripe dashboard after creation if needed.
        // Based on typical market rates (updated Jan 2026)
        const exchangeRates = {
          usd: 1.0,
          eur: 0.92,  // 1 USD = ~0.92 EUR
          gbp: 0.79,  // 1 USD = ~0.79 GBP
          aud: 1.52,  // 1 USD = ~1.52 AUD
          cad: 1.35,  // 1 USD = ~1.35 CAD
          nzd: 1.63,  // 1 USD = ~1.63 NZD
        };

        // Create Stripe prices for all supported currencies with proper conversion
        const currencies = [
          { code: 'usd', symbol: '$' },
          { code: 'eur', symbol: '€' },
          { code: 'gbp', symbol: '£' },
          { code: 'aud', symbol: 'A$' },
          { code: 'cad', symbol: 'C$' },
          { code: 'nzd', symbol: 'NZ$' },
        ];

        const usdPriceInCents = Math.round(parseFloat(challengePrice) * 100);

        for (const { code, symbol } of currencies) {
          try {
            // Convert USD price to target currency
            const convertedPrice = parseFloat(challengePrice) * exchangeRates[code];
            const priceInCents = Math.round(convertedPrice * 100);

            const newPrice = await stripe.prices.create({
              product: productId,
              unit_amount: priceInCents,
              currency: code,
              nickname: `Challenge Price - ${symbol}${convertedPrice.toFixed(2)} ${code.toUpperCase()}`,
            });

            newPriceIds[code] = newPrice.id;
            console.log(`Created Stripe price for ${code.toUpperCase()}: ${newPrice.id} (${symbol}${convertedPrice.toFixed(2)} = $${challengePrice} USD)`);
          } catch (err) {
            console.error(`Failed to create price for ${code}:`, err.message);
            // Continue with other currencies even if one fails
          }
        }
      }

      // Prepare settings to update
      const settingsToUpdate = [];

      if (challengePrice) {
        settingsToUpdate.push({
          key: 'challenge_price',
          value: challengePrice,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      }

      // Save all currency price IDs
      if (Object.keys(newPriceIds).length > 0) {
        for (const [currency, priceId] of Object.entries(newPriceIds)) {
          settingsToUpdate.push({
            key: `stripe_price_id_${currency}`,
            value: priceId,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          });
        }

        // Also save USD price ID as legacy stripe_price_id for backward compatibility
        if (newPriceIds.usd) {
          settingsToUpdate.push({
            key: 'stripe_price_id',
            value: newPriceIds.usd,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (siteName !== undefined) {
        settingsToUpdate.push({
          key: 'site_name',
          value: siteName,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      }

      if (supportEmail !== undefined) {
        settingsToUpdate.push({
          key: 'support_email',
          value: supportEmail,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      }

      if (accessDuration !== undefined) {
        settingsToUpdate.push({
          key: 'access_duration',
          value: parseInt(accessDuration),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      }

      if (logoUrl !== undefined) {
        settingsToUpdate.push({
          key: 'logo_url',
          value: logoUrl,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      }

      if (faviconUrl !== undefined) {
        settingsToUpdate.push({
          key: 'favicon_url',
          value: faviconUrl,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });
      }

      // Upsert all settings
      if (settingsToUpdate.length > 0) {
        const { error: upsertError } = await supabase
          .from('app_settings')
          .upsert(settingsToUpdate, { onConflict: 'key' });

        if (upsertError) {
          console.error('Error updating settings:', upsertError);
          return res.status(500).json({ error: 'Failed to update settings' });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        newPriceIds,
        pricesCreated: Object.keys(newPriceIds).length,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Settings API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
