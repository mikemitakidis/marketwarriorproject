import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/settings
 * GET: Fetch user's journal settings (auto-creates if not exists)
 * POST: Update user's journal settings
 */
export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.api, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      // Try to get existing settings
      let { data: settings, error } = await supabase
        .from('journal_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching journal settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }

      // Auto-create if doesn't exist
      if (!settings) {
        const { data: newSettings, error: insertError } = await supabase
          .from('journal_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          logger.error('Error creating journal settings:', insertError);
          return res.status(500).json({ error: 'Failed to create settings' });
        }
        settings = newSettings;
      }

      return res.status(200).json(settings);
    }

    if (req.method === 'POST') {
      const {
        account_size,
        base_currency,
        default_risk_percent,
        default_commission,
        trading_sessions,
        show_r_multiples,
        show_dollar_amounts,
      } = req.body;

      const updates = {};

      if (account_size !== undefined) {
        const size = parseFloat(account_size);
        if (isNaN(size) || size < 0) {
          return res.status(400).json({ error: 'Invalid account size' });
        }
        updates.account_size = size;
      }

      if (base_currency !== undefined) {
        updates.base_currency = base_currency.toUpperCase();
      }

      if (default_risk_percent !== undefined) {
        const risk = parseFloat(default_risk_percent);
        if (isNaN(risk) || risk < 0 || risk > 100) {
          return res.status(400).json({ error: 'Risk percent must be between 0 and 100' });
        }
        updates.default_risk_percent = risk;
      }

      if (default_commission !== undefined) {
        const commission = parseFloat(default_commission);
        if (isNaN(commission) || commission < 0) {
          return res.status(400).json({ error: 'Invalid commission' });
        }
        updates.default_commission = commission;
      }

      if (trading_sessions !== undefined) {
        if (!Array.isArray(trading_sessions)) {
          return res.status(400).json({ error: 'Trading sessions must be an array' });
        }
        updates.trading_sessions = trading_sessions;
      }

      if (show_r_multiples !== undefined) {
        updates.show_r_multiples = Boolean(show_r_multiples);
      }

      if (show_dollar_amounts !== undefined) {
        updates.show_dollar_amounts = Boolean(show_dollar_amounts);
      }

      // Upsert settings
      const { data, error } = await supabase
        .from('journal_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        logger.error('Error updating journal settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Journal settings API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
