import { clearAuthCookies } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API route: /api/auth/logout
 *
 * Clears the authentication cookies and returns the redirect URL.
 * Client should redirect to the returned `next` URL after calling this.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Apply rate limiting for auth operations
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.auth, identifier);
  if (limited) return;

  clearAuthCookies(res);
  return res.status(200).json({ ok: true, next: '/login' });
}
