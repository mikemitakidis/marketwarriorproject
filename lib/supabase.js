/*
 * Supabase client helper
 *
 * Exposes an instance of the Supabase client configured with the
 * anonymous and service role keys from the environment.  Client‑side
 * calls should use the public anon key while server‑side API routes
 * can leverage the service key to bypass row level security where
 * appropriate.  See `.env.example` for configuration.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

// Client for client‑side code (browser). Should not expose the service key.
export const supabaseClient = createClient(supabaseUrl, anonKey);

// Client for server‑side code. Uses service key when present; otherwise
// falls back to anon key. Note: service key grants full access to the
// database; restrict usage to server environment only.
export function getServiceSupabase() {
  const key = typeof window === 'undefined' && serviceKey ? serviceKey : anonKey;
  return createClient(supabaseUrl, key);
}