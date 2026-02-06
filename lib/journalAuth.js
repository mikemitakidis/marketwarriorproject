/**
 * Journal Authentication System
 *
 * Completely separate from the course authentication.
 * Uses journal_users table and separate cookies (tj_at, tj_rt).
 */

import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

export const JOURNAL_COOKIE_ACCESS = 'tj_at';
export const JOURNAL_COOKIE_REFRESH = 'tj_rt';

export function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key);
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key);
}

export function readJournalTokens(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  return {
    accessToken: cookies[JOURNAL_COOKIE_ACCESS] || null,
    refreshToken: cookies[JOURNAL_COOKIE_REFRESH] || null,
  };
}

/**
 * Get journal user from request.
 * This checks against the journal_users table, not user_profiles.
 * Includes automatic token refresh when access token expires.
 */
export async function getJournalUser(req, res = null) {
  const { accessToken, refreshToken } = readJournalTokens(req);
  if (!accessToken && !refreshToken) return null;

  const supabase = getAnonSupabase();

  // Try access token first
  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) {
      return await getJournalUserFromAuth(data.user);
    }
  }

  // Access token failed/expired - try refresh token
  if (refreshToken && res) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (!refreshError && refreshData?.session) {
      // Set new cookies with refreshed tokens
      setJournalAuthCookies(res, refreshData.session);

      // Get user from refreshed session
      const { data: userData } = await supabase.auth.getUser(refreshData.session.access_token);
      if (userData?.user) {
        return await getJournalUserFromAuth(userData.user);
      }
    }
  }

  return null;
}

/**
 * Helper: Get journal user data from auth user.
 */
async function getJournalUserFromAuth(authUser) {
  const admin = getServiceSupabase();
  const { data: journalUser, error: journalError } = await admin
    .from('journal_users')
    .select('id, email, full_name, created_at, has_paid, paid_at')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (journalError || !journalUser) {
    return null;
  }

  return {
    id: journalUser.id,
    authId: authUser.id,
    email: journalUser.email,
    fullName: journalUser.full_name,
    hasPaid: journalUser.has_paid || false,
    paidAt: journalUser.paid_at,
    createdAt: journalUser.created_at,
  };
}

/**
 * Create or get journal user.
 * Called after successful auth to ensure user exists in journal_users table.
 */
export async function ensureJournalUser(authUser) {
  const admin = getServiceSupabase();

  // Check if user already exists
  const { data: existing } = await admin
    .from('journal_users')
    .select('id, email, full_name, has_paid, paid_at')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create new journal user
  const { data: newUser, error } = await admin
    .from('journal_users')
    .insert({
      auth_id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || null,
      has_paid: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating journal user:', error);
    throw error;
  }

  return newUser;
}

export function setJournalAuthCookies(res, session) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  // In production, set cookie domain to share between www and apex
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      const hostname = url.hostname;
      const rootDomain = hostname.replace(/^www\./, '');
      base.domain = `.${rootDomain}`;
    } catch (e) {
      // If URL parsing fails, don't set domain
    }
  }

  const cookies = [
    cookie.serialize(JOURNAL_COOKIE_ACCESS, session.access_token, { ...base, maxAge: 60 * 60 }),
    cookie.serialize(JOURNAL_COOKIE_REFRESH, session.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 }),
  ];

  res.setHeader('Set-Cookie', cookies);
}

export function clearJournalAuthCookies(res) {
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
      // If URL parsing fails, don't set domain
    }
  }

  res.setHeader('Set-Cookie', [
    cookie.serialize(JOURNAL_COOKIE_ACCESS, '', { ...base, maxAge: 0 }),
    cookie.serialize(JOURNAL_COOKIE_REFRESH, '', { ...base, maxAge: 0 }),
  ]);
}

/**
 * Get journal settings from app_settings table.
 * Returns settings for AI chat enabled and paid mode.
 */
export async function getJournalSettings() {
  const admin = getServiceSupabase();

  const { data: settings } = await admin
    .from('app_settings')
    .select('key, value')
    .in('key', ['journal_ai_chat_enabled', 'journal_paid_enabled']);

  const result = {
    aiChatEnabled: true, // Default to true
    paidEnabled: false,   // Default to false (free phase)
  };

  // Helper to check truthy values (handles 'true', true, '1', 1, 'yes', 'on')
  const isTruthy = (val) => {
    if (val === true || val === 1) return true;
    if (typeof val === 'string') {
      const v = val.toLowerCase().trim();
      return v === 'true' || v === '1' || v === 'yes' || v === 'on';
    }
    return false;
  };

  if (settings) {
    settings.forEach(s => {
      if (s.key === 'journal_ai_chat_enabled') {
        result.aiChatEnabled = isTruthy(s.value);
      } else if (s.key === 'journal_paid_enabled') {
        result.paidEnabled = isTruthy(s.value);
      }
    });
  }

  return result;
}

/**
 * Check if user has journal access.
 * In free phase: all authenticated users have access.
 * In paid phase: only users with has_paid=true have access.
 */
export async function checkJournalAccess(journalUser) {
  const settings = await getJournalSettings();

  // If paid mode is disabled, everyone has access
  if (!settings.paidEnabled) {
    return { hasAccess: true, requiresPayment: false };
  }

  // Paid mode is enabled - check if user has paid
  if (journalUser.hasPaid) {
    return { hasAccess: true, requiresPayment: false };
  }

  // User needs to pay - redirect to upgrade page
  return {
    hasAccess: false,
    requiresPayment: true,
  };
}
