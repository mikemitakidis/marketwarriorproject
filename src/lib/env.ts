/**
 * Centralised env helpers.
 *
 * We support both naming conventions because your Vercel project currently uses
 * NEXT_PUBLIC_APP_URL + SUPABASE_SERVICE_KEY.
 */

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  );
}

export function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  );
}
