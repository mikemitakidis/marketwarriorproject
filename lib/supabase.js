// lib/supabase.js - Supabase client for browser
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser client (singleton)
let browserClient = null;

export function createClient() {
  if (typeof window === 'undefined') {
    // Server-side: always create new client
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase env vars missing - returning mock client for build');
      return { auth: { getUser: async () => ({ data: { user: null } }) } };
    }
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }
  
  // Browser: use singleton
  if (!browserClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    browserClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return browserClient;
}

// Export alias for compatibility
export { createClient as supabase };
export default createClient;
