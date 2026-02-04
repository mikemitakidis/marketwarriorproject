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
        .in('key', ['journal_ai_chat_enabled', 'journal_paid_enabled']);

      if (error) {
        console.error('Error fetching journal settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }

      const result = {
        aiChatEnabled: true,
        paidEnabled: false,
      };

      if (settings) {
        settings.forEach(s => {
          if (s.key === 'journal_ai_chat_enabled') {
            result.aiChatEnabled = s.value === 'true';
          } else if (s.key === 'journal_paid_enabled') {
            result.paidEnabled = s.value === 'true';
          }
        });
      }

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { aiChatEnabled, paidEnabled } = req.body;

      // Upsert each setting
      const settingsToUpsert = [
        { key: 'journal_ai_chat_enabled', value: String(aiChatEnabled === true) },
        { key: 'journal_paid_enabled', value: String(paidEnabled === true) },
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
