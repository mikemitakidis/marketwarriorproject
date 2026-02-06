import { getUserFromRequest, getServiceSupabase, verifyAdminAccess } from '../../../lib/serverAuth';
import { sendTransactionalEmail } from '../../../lib/loops';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * POST /api/admin/broadcast-email
 *
 * Sends a broadcast email to a filtered audience via Loops Transactional API.
 *
 * Body:
 *   - transactionalId: string  (Loops transactional template ID)
 *   - subject: string          (subject line – passed as a data variable)
 *   - body: string             (email content – passed as a data variable)
 *   - audience: string         (filter key: "all", "active", "completed",
 *                               "day_1_10", "day_11_20", "day_21_30", "inactive_7d")
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth + admin check
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const isAdmin = await verifyAdminAccess(user);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  // Rate limit
  const identifier = getIdentifier(req, user.id);
  const limited = await applyRateLimit(req, res, rateLimiters.admin, identifier);
  if (limited) return;

  const { transactionalId, subject, body, audience } = req.body || {};

  if (!transactionalId) {
    return res.status(400).json({ error: 'transactionalId is required (your Loops template ID)' });
  }
  if (!subject || !body) {
    return res.status(400).json({ error: 'subject and body are required' });
  }

  try {
    const supabase = getServiceSupabase();

    // Build recipient list based on audience filter
    const recipients = await getRecipients(supabase, audience || 'all');

    if (recipients.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No matching recipients' });
    }

    logger.log(`[BROADCAST] Sending to ${recipients.length} recipients (audience: ${audience})`);

    // Send to each recipient (Loops handles deduplication)
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const recipient of recipients) {
      const result = await sendTransactionalEmail(transactionalId, recipient.email, {
        subject,
        body,
        firstName: recipient.full_name || 'Student',
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({ email: recipient.email, error: result.error });
      }
    }

    logger.log(`[BROADCAST] Complete: ${sent} sent, ${failed} failed`);

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: recipients.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Cap error details
    });
  } catch (err) {
    logger.error('[BROADCAST] Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

/**
 * Query recipients based on audience segment.
 */
async function getRecipients(supabase, audience) {
  const baseSelect = 'id, email, full_name';

  switch (audience) {
    case 'active': {
      // Users who have paid and logged in within last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('user_profiles')
        .select(baseSelect)
        .eq('has_paid', true)
        .not('email', 'is', null)
        .gte('last_login', sevenDaysAgo.toISOString());

      return data || [];
    }

    case 'completed': {
      // Users who completed day 30
      const { data } = await supabase
        .from('challenge_progress')
        .select('user_id')
        .eq('day', 30)
        .eq('completed', true);

      if (!data || data.length === 0) return [];

      const userIds = data.map(r => r.user_id);
      const { data: users } = await supabase
        .from('user_profiles')
        .select(baseSelect)
        .in('id', userIds)
        .not('email', 'is', null);

      return users || [];
    }

    case 'day_1_10':
    case 'day_11_20':
    case 'day_21_30': {
      // Parse day range from audience key
      const ranges = { day_1_10: [1, 10], day_11_20: [11, 20], day_21_30: [21, 30] };
      const [minDay, maxDay] = ranges[audience];

      // Get users whose max completed day falls in the range
      const { data: progress } = await supabase
        .from('challenge_progress')
        .select('user_id, day')
        .eq('completed', true);

      if (!progress || progress.length === 0) return [];

      // Group by user and find max completed day
      const userMaxDay = {};
      for (const row of progress) {
        if (!userMaxDay[row.user_id] || row.day > userMaxDay[row.user_id]) {
          userMaxDay[row.user_id] = row.day;
        }
      }

      const matchingUserIds = Object.entries(userMaxDay)
        .filter(([, maxCompleted]) => maxCompleted >= minDay && maxCompleted <= maxDay)
        .map(([uid]) => uid);

      if (matchingUserIds.length === 0) return [];

      const { data: users } = await supabase
        .from('user_profiles')
        .select(baseSelect)
        .in('id', matchingUserIds)
        .not('email', 'is', null);

      return users || [];
    }

    case 'inactive_7d': {
      // Users who haven't logged in for 7+ days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('user_profiles')
        .select(baseSelect)
        .eq('has_paid', true)
        .not('email', 'is', null)
        .lte('last_login', sevenDaysAgo.toISOString());

      return data || [];
    }

    case 'all':
    default: {
      // All paid users with an email
      const { data } = await supabase
        .from('user_profiles')
        .select(baseSelect)
        .eq('has_paid', true)
        .not('email', 'is', null);

      return data || [];
    }
  }
}
