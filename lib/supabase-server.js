// lib/supabase-server.js - Server-side Supabase clients
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

function validateEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }
}

// Server-side client with user's auth token
export function createServerSupabase(accessToken) {
  validateEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: 'Bearer ' + accessToken }
    }
  });
}

// Admin client (uses service role key - NEVER expose to client)
export function createAdminSupabase() {
  validateEnv();
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY - required for admin operations');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { createServerSupabase as createServerClient };
