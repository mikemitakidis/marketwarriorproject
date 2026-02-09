/**
 * Forum spam/abuse controls.
 *
 * - Counts links in text (max 3 allowed)
 * - Auto-flags posts with too many links
 * - Checks if user is banned from forum
 */

const MAX_LINKS = 3;

// Match URLs in text (http/https/www)
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/gi;

/**
 * Count links in text.
 */
export function countLinks(text) {
  if (!text) return 0;
  const matches = text.match(URL_REGEX);
  return matches ? matches.length : 0;
}

/**
 * Check text for spam indicators.
 * Returns { ok, reason, shouldAutoFlag }
 */
export function checkSpam(text) {
  const linkCount = countLinks(text);

  if (linkCount > MAX_LINKS) {
    return { ok: false, reason: `Too many links. Maximum ${MAX_LINKS} links allowed per post.`, shouldAutoFlag: true };
  }

  return { ok: true, reason: null, shouldAutoFlag: false };
}

/**
 * Check if user is banned from the forum.
 * @param {object} supabase - Service role supabase client
 * @param {string} userId
 * @returns {Promise<{banned: boolean, reason: string|null}>}
 */
export async function checkForumBan(supabase, userId) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_forum_banned, forum_ban_reason')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_forum_banned) {
    return { banned: true, reason: profile.forum_ban_reason || 'You are banned from the forum.' };
  }

  return { banned: false, reason: null };
}
