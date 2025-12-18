import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client used for verifying JWTs and performing
 * privileged operations.  It is configured with the service role key
 * so that it can bypass row level security when necessary.  Do not
 * expose this client to the client side.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

/**
 * Extracts and verifies a Supabase JWT from the Authorization header.
 *
 * The Authorization header must be in the form `Bearer <token>`.  If
 * validation succeeds the function returns the user record (id,
 * email, etc.).  Throws an error if the token is missing or
 * invalid.
 *
 * @param {object} req The Next.js API request object
 */
export async function getUserFromJwt(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new Error('Invalid Authorization header');
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  return user;
}

/**
 * Retrieves the user profile for the authenticated user.
 *
 * This helper looks up the user in `public.user_profiles` using the
 * provided user id.  It returns the profile row including any
 * custom columns (e.g. `is_admin`, `terms_accepted_at`).
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error('Failed to fetch user profile');
  return data;
}

export { supabaseAdmin };