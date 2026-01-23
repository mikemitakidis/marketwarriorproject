import { getAnonSupabase, setAuthCookies, getGateStatus, determineNextRoute } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Apply rate limiting for auth operations
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.auth, identifier);
  if (limited) return;
  try {
    const { access_token, refresh_token, next } = req.body || {};
    if (!access_token || !refresh_token) return res.status(400).json({ error: 'Missing tokens' });

    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.getUser(access_token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    setAuthCookies(res, { access_token, refresh_token });
    const gate = await getGateStatus(data.user.id, data.user.email);
    return res.status(200).json({ ok: true, next: determineNextRoute(gate, next) });
  } catch (e) {
    logger.error('set-session error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
