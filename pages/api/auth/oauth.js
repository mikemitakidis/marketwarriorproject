import { getAnonSupabase } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Apply rate limiting
  const identifier = getIdentifier(req);
  const rateLimitResult = await applyRateLimit(req, res, rateLimiters.auth, identifier);
  if (rateLimitResult) return rateLimitResult;

  try {
    // SECURITY: Only allow whitelisted OAuth providers
    const allowedProviders = ['google'];
    const provider = (req.query.provider || 'google').toString();
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Unsupported login provider' });
    }
    const next = (req.query.next || '/pay').toString();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return res.status(500).json({ error: 'Service unavailable' });

    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = getAnonSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });

    if (error || !data?.url) {
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }

    res.writeHead(302, { Location: data.url });
    res.end();
  } catch (e) {
    logger.error('oauth error:', e);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}
