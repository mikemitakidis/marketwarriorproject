/**
 * Admin API: Journal Settings
 *
 * GET: Retrieve journal settings from app_settings
 * POST: Update journal settings in app_settings
 */

import { getUserFromRequest, verifyAdminAccess, getServiceSupabase } from '../../../lib/serverAuth';

export default async function handler(req, res) {
  try {
    // Verify admin access
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      // Fetch journal settings
      const { data: settings, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['journal_ai_chat_enabled', 'journal_paid_enabled', 'etoro_affiliate_url']);

      if (error) {
        console.error('Error fetching journal settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }

      // Helper to check truthy values (handles 'true', true, '1', 1, 'yes', 'on')
      const isTruthy = (val) => {
        if (val === true || val === 1) return true;
        if (typeof val === 'string') {
          const v = val.toLowerCase().trim();
          return v === 'true' || v === '1' || v === 'yes' || v === 'on';
        }
        return false;
      };

      const result = {
        aiChatEnabled: true,
        paidEnabled: false,
        etoroAffiliateUrl: '',
      };

      if (settings) {
        settings.forEach(s => {
          if (s.key === 'journal_ai_chat_enabled') {
            result.aiChatEnabled = isTruthy(s.value);
          } else if (s.key === 'journal_paid_enabled') {
            result.paidEnabled = isTruthy(s.value);
          } else if (s.key === 'etoro_affiliate_url') {
            result.etoroAffiliateUrl = s.value || '';
          }
        });
      }

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { aiChatEnabled, paidEnabled, etoroAffiliateUrl } = req.body;

      // Upsert each setting
      const settingsToUpsert = [
        { key: 'journal_ai_chat_enabled', value: String(aiChatEnabled === true) },
        { key: 'journal_paid_enabled', value: String(paidEnabled === true) },
        { key: 'etoro_affiliate_url', value: etoroAffiliateUrl || '' },
      ];

      for (const setting of settingsToUpsert) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) {
          console.error('Error upserting setting:', setting.key, error);
          return res.status(500).json({ error: `Failed to save ${setting.key}` });
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Journal settings API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
