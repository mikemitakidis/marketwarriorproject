import { getAnonSupabase, getServiceSupabase, setAuthCookies, clearAuthCookies, getGateStatus, determineNextRoute } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Apply rate limiting
  const identifier = getIdentifier(req);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.auth, identifier);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }

    setAuthCookies(res, data.session);

    // Update last_login timestamp (non-blocking)
    getServiceSupabase()
      .from('user_profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)
      .then(({ error: updateErr }) => {
        if (updateErr) logger.error('Failed to update last_login:', updateErr.message);
      });

    const gate = await getGateStatus(data.user.id, email);

    // Block suspended users
    if (gate.isSuspended) {
      clearAuthCookies(res);
      const suspendedUntilDate = gate.suspendedUntil ? new Date(gate.suspendedUntil).toLocaleString() : 'further notice';
      return res.status(403).json({
        error: `Your account is suspended until ${suspendedUntilDate}. Please contact support if you believe this is an error.`
      });
    }

    const next = determineNextRoute(gate);

    return res.status(200).json({ ok: true, next });
  } catch (e) {
    logger.error('login error:', e);
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
