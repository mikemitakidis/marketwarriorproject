import { getUserFromRequest, getServiceSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * API: /api/journal/rules
 * GET: Fetch user's challenge rules
 * POST: Create a new rule
 * PUT: Update a rule (requires ?id=xxx)
 * DELETE: Delete a rule (requires ?id=xxx)
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
      const { active_only } = req.query;

      let query = supabase
        .from('journal_challenge_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (active_only === 'true') {
        query = query.eq('is_active', true);
      }

      const { data: rules, error } = await query;

      if (error) {
        logger.error('Error fetching rules:', error);
        return res.status(500).json({ error: 'Failed to fetch rules' });
      }

      // Also fetch recent violations
      const { data: violations } = await supabase
        .from('journal_rule_violations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return res.status(200).json({ rules, recentViolations: violations || [] });
    }

    if (req.method === 'POST') {
      const { rule_type, rule_value, description, is_active = true } = req.body;

      const validRuleTypes = [
        'max_daily_loss',
        'max_daily_loss_pct',
        'max_trades_per_day',
        'max_risk_per_trade',
        'max_position_size',
        'required_stop_loss',
        'min_rr_ratio',
        'forbidden_instrument',
        'trading_hours_only',
        'custom',
      ];

      if (!rule_type || !validRuleTypes.includes(rule_type)) {
        return res.status(400).json({ error: 'Invalid rule type' });
      }

      if (!rule_value || typeof rule_value !== 'object') {
        return res.status(400).json({ error: 'Rule value must be an object' });
      }

      const { data: rule, error } = await supabase
        .from('journal_challenge_rules')
        .insert({
          user_id: user.id,
          rule_type,
          rule_value,
          description: description || null,
          is_active,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating rule:', error);
        return res.status(500).json({ error: 'Failed to create rule' });
      }

      return res.status(201).json(rule);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Rule ID required' });
      }

      const { rule_value, description, is_active } = req.body;

      // Verify ownership
      const { data: existing } = await supabase
        .from('journal_challenge_rules')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const updates = {};
      if (rule_value !== undefined) updates.rule_value = rule_value;
      if (description !== undefined) updates.description = description;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data: rule, error } = await supabase
        .from('journal_challenge_rules')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating rule:', error);
        return res.status(500).json({ error: 'Failed to update rule' });
      }

      return res.status(200).json(rule);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Rule ID required' });
      }

      const { error } = await supabase
        .from('journal_challenge_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Error deleting rule:', error);
        return res.status(500).json({ error: 'Failed to delete rule' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    logger.error('Journal rules API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
