/**
 * TRADING JOURNAL - SEPARATE AUTHENTICATION
 * Completely independent from the course authentication.
 */

import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

// Separate cookies for Trading Journal
export const JOURNAL_COOKIE_ACCESS = 'tj_at';
export const JOURNAL_COOKIE_REFRESH = 'tj_rt';

export function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service config');
  return createClient(url, key);
}

/**
 * Read Trading Journal auth tokens from request
 */
export function readJournalTokens(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return {
    accessToken: cookies[JOURNAL_COOKIE_ACCESS] || null,
    refreshToken: cookies[JOURNAL_COOKIE_REFRESH] || null,
  };
}

/**
 * Get the authenticated Trading Journal user from request
 * Returns the journal_users record, NOT user_profiles
 */
export async function getJournalUser(req) {
  const { accessToken } = readJournalTokens(req);
  if (!accessToken) return null;

  try {
    const supabase = getAnonSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData?.user) return null;

    // Get the journal user profile (NOT user_profiles - completely separate)
    const serviceSupabase = getServiceSupabase();
    const { data: journalUser, error: journalError } = await serviceSupabase
      .from('journal_users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (journalError || !journalUser) return null;

    return {
      ...journalUser,
      email: authData.user.email,
    };
  } catch (err) {
    console.error('getJournalUser error:', err);
    return null;
  }
}

/**
 * Set Trading Journal auth cookies
 */
export function setJournalCookies(res, session) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  // Set domain for production
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      const hostname = url.hostname;
      const rootDomain = hostname.replace(/^www\./, '');
      base.domain = `.${rootDomain}`;
    } catch (e) {
      // Ignore
    }
  }

  const cookies = [
    cookie.serialize(JOURNAL_COOKIE_ACCESS, session.access_token, { ...base, maxAge: 60 * 60 }),
    cookie.serialize(JOURNAL_COOKIE_REFRESH, session.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 }),
  ];

  res.setHeader('Set-Cookie', cookies);
}

/**
 * Clear Trading Journal auth cookies
 */
export function clearJournalCookies(res) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      const hostname = url.hostname;
      const rootDomain = hostname.replace(/^www\./, '');
      base.domain = `.${rootDomain}`;
    } catch (e) {
      // Ignore
    }
  }

  res.setHeader('Set-Cookie', [
    cookie.serialize(JOURNAL_COOKIE_ACCESS, '', { ...base, maxAge: 0 }),
    cookie.serialize(JOURNAL_COOKIE_REFRESH, '', { ...base, maxAge: 0 }),
  ]);
}

/**
 * Create a new Trading Journal user after Supabase auth registration
 */
export async function createJournalUser(authUserId, email, fullName = null) {
  const supabase = getServiceSupabase();

  // Check if journal user already exists
  const { data: existing } = await supabase
    .from('journal_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create new journal user
  const { data, error } = await supabase
    .from('journal_users')
    .insert({
      auth_user_id: authUserId,
      email,
      full_name: fullName,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating journal user:', error);
    throw error;
  }

  return data;
}
