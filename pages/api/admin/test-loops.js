import { getUserFromRequest, verifyAdminAccess, getServiceSupabase } from '../../../lib/serverAuth';
import { sendLoopsEvent, LOOPS_EVENTS } from '../../../lib/loops';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

/**
 * POST /api/admin/test-loops
 *
 * Admin-only endpoint to test Loops integration by firing a specific event
 * to a test email address.
 *
 * Body:
 *   - email: string       (recipient email to test with)
 *   - eventName: string   (one of the LOOPS_EVENTS values, e.g. "challenge_welcome")
 *
 * After calling, check the Loops > Audience tab to verify the event appeared.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const isAdmin = await verifyAdminAccess(user);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  const identifier = getIdentifier(req, user.id);
  const limited = await applyRateLimit(req, res, rateLimiters.admin, identifier);
  if (limited) return;

  const { email, eventName } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  // Validate eventName against known events
  const validEvents = Object.values(LOOPS_EVENTS);
  if (!eventName || !validEvents.includes(eventName)) {
    return res.status(400).json({
      error: `Invalid eventName. Must be one of: ${validEvents.join(', ')}`,
      validEvents,
    });
  }

  try {
    const result = await sendLoopsEvent(email, eventName, {
      testMode: true,
      firedBy: user.email,
      firedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Event "${eventName}" sent to ${email}. Check Loops > Audience tab.`
        : `Failed: ${result.error}`,
      event: eventName,
      recipient: email,
    });
  } catch (err) {
    logger.error('[TEST-LOOPS] Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
