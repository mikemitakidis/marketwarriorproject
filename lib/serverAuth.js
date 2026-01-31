import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import logger from './logger';

export const COOKIE_ACCESS = 'mw_at';
export const COOKIE_REFRESH = 'mw_rt';

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

export function readTokens(req) {
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const accessToken = auth.substring(7);
    return { accessToken, refreshToken: null };
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  return { accessToken: cookies[COOKIE_ACCESS] || null, refreshToken: cookies[COOKIE_REFRESH] || null };
}

export async function getUserFromRequest(req) {
  const { accessToken } = readTokens(req);
  if (!accessToken) return null;

  const supabase = getAnonSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

export function setAuthCookies(res, session) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  // In production, set cookie domain to share between www and apex
  // Extract domain from NEXT_PUBLIC_APP_URL (e.g., https://www.marketwarrior.club -> .marketwarrior.club)
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      const hostname = url.hostname;
      // Remove 'www.' prefix if present and add leading dot for subdomain sharing
      const rootDomain = hostname.replace(/^www\./, '');
      base.domain = `.${rootDomain}`;
    } catch (e) {
      // If URL parsing fails, don't set domain (cookies will default to current host)
    }
  }

  const cookies = [
    cookie.serialize(COOKIE_ACCESS, session.access_token, { ...base, maxAge: 60 * 60 }),
    cookie.serialize(COOKIE_REFRESH, session.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 }),
  ];

  res.setHeader('Set-Cookie', cookies);
}

export function clearAuthCookies(res) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  // Match domain setting from setAuthCookies for proper cookie clearing
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
    cookie.serialize(COOKIE_ACCESS, '', { ...base, maxAge: 0 }),
    cookie.serialize(COOKIE_REFRESH, '', { ...base, maxAge: 0 }),
  ]);
}

export async function getGateStatus(userId, userEmail = null) {
  const admin = getServiceSupabase();
  logger.log('[GATE] Checking gate for userId:', userId, 'email:', userEmail);

  // Get user profile (including access expiration and suspension fields)
  // NOTE: unlimited_access, suspended_until columns might not exist if migration hasn't been run yet
  const { data: profile, error: profileError} = await admin
    .from('user_profiles')
    .select('has_paid, paid_at, full_name, suspended_until, suspension_reason, access_expires_at')
    .eq('id', userId)
    .maybeSingle();

  // Try to get unlimited_access separately to handle missing column gracefully
  let unlimited_access = false;
  try {
    const { data: accessData, error: accessError } = await admin
      .from('user_profiles')
      .select('unlimited_access')
      .eq('id', userId)
      .maybeSingle();

    // If no error, use the value; otherwise default to false
    if (!accessError && accessData) {
      unlimited_access = accessData.unlimited_access || false;
    }
  } catch (e) {
    // Column doesn't exist yet - default to false
    logger.log('[GATE] unlimited_access column not found (migration pending)');
  }

  if (profileError) {
    logger.error('[GATE] Profile query error:', profileError.message);
  }
  logger.log('[GATE] Profile result:', JSON.stringify(profile));

  let hasPaid = !!profile?.has_paid;
  logger.log('[GATE] hasPaid from profile:', hasPaid);

  // Check if user is suspended
  let isSuspended = false;
  let suspendedUntil = null;
  if (profile?.suspended_until) {
    suspendedUntil = profile.suspended_until;
    const suspendedDate = new Date(suspendedUntil);
    const now = new Date();
    isSuspended = now < suspendedDate;
    logger.log('[GATE] Suspension check:', {
      suspended_until: suspendedUntil,
      now: now.toISOString(),
      is_suspended: isSuspended
    });
  }

  // Check if access has expired (check explicit expiration first, then calculated)
  let accessExpired = false;

  // Check explicit access_expires_at column first
  if (hasPaid && profile?.access_expires_at && !unlimited_access) {
    const expiresAt = new Date(profile.access_expires_at);
    const now = new Date();
    accessExpired = now > expiresAt;
    logger.log('[GATE] Access expiration check (explicit):', {
      access_expires_at: profile.access_expires_at,
      now: now.toISOString(),
      expired: accessExpired,
      unlimitedAccess: unlimited_access
    });
  } else if (hasPaid && profile?.paid_at && !unlimited_access) {
    // Only fetch access duration when we need to check expiration
    let accessDuration = 120;
    try {
      const { data: durationSetting } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', 'access_duration')
        .maybeSingle();

      if (durationSetting?.value) {
        const parsed = parseInt(durationSetting.value);
        if (!isNaN(parsed) && parsed > 0) {
          accessDuration = parsed;
        }
      }
    } catch (e) {
      // Use default 120 days on error
    }

    const paidDate = new Date(profile.paid_at);
    const expirationDate = new Date(paidDate);
    expirationDate.setDate(expirationDate.getDate() + accessDuration);
    const now = new Date();
    accessExpired = now > expirationDate;
    logger.log('[GATE] Access expiration check (calculated):', {
      paidAt: profile.paid_at,
      accessDuration: accessDuration,
      expiresAt: expirationDate.toISOString(),
      now: now.toISOString(),
      expired: accessExpired,
      unlimitedAccess: unlimited_access
    });
  }

  // Check explicit access_expires_at if set (takes precedence over calculated expiration)
  if (hasPaid && profile?.access_expires_at && !unlimited_access) {
    const expiresAt = new Date(profile.access_expires_at);
    const now = new Date();
    accessExpired = now > expiresAt;
    logger.log('[GATE] Access expiration check (explicit):', {
      access_expires_at: profile.access_expires_at,
      now: now.toISOString(),
      expired: accessExpired,
      unlimitedAccess: unlimited_access
    });
  }

  // If profile says not paid, double-check payments table
  if (!hasPaid) {
    const { data: payment } = await admin
      .from('payments')
      .select('id, paid_at')
      .eq('user_id', userId)
      .eq('status', 'succeeded')
      .maybeSingle();

    if (payment) {
      // Payment exists in DB - update profile and mark as paid with original timestamp
      hasPaid = true;
      await admin.from('user_profiles').upsert({
        id: userId,
        has_paid: true,
        paid_at: payment.paid_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  }

  // If still not paid and we have email, check Stripe directly
  if (!hasPaid && userEmail && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

      // Fetch valid price IDs from app_settings for validation
      const { data: priceSettings } = await admin
        .from('app_settings')
        .select('key, value')
        .like('key', 'stripe_price_id%');

      const validPriceIds = new Set();
      if (priceSettings) {
        priceSettings.forEach(s => validPriceIds.add(s.value));
      }
      // Also add env var price ID as fallback
      if (process.env.STRIPE_PRICE_ID) {
        validPriceIds.add(process.env.STRIPE_PRICE_ID);
      }

      // Search for successful checkout sessions by customer email
      const sessions = await stripe.checkout.sessions.list({ limit: 100 });

      // Find session that matches email AND has valid price ID
      let userSession = null;
      for (const session of sessions.data) {
        if (session.customer_details?.email?.toLowerCase() === userEmail.toLowerCase() &&
            session.payment_status === 'paid') {

          // SECURITY: Validate the price ID before granting access
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items']
          });

          const lineItems = fullSession.line_items?.data || [];
          const hasValidPrice = lineItems.some(item => validPriceIds.has(item.price?.id));

          if (hasValidPrice) {
            userSession = fullSession;
            break; // Found valid payment
          } else {
            logger.warn(`Stripe session ${session.id} has invalid price ID - skipping auto-sync`);
          }
        }
      }

      if (userSession) {
        // Found VALIDATED payment in Stripe - sync to database
        hasPaid = true;
        // Use Stripe session creation time (convert Unix timestamp to ISO string)
        const actualPaymentTime = new Date(userSession.created * 1000).toISOString();

        await admin.from('user_profiles').upsert({
          id: userId,
          has_paid: true,
          paid_at: actualPaymentTime,
        }, { onConflict: 'id' });

        await admin.from('payments').upsert({
          user_id: userId,
          stripe_session_id: userSession.id,
          amount_cents: userSession.amount_total,
          currency: userSession.currency || 'usd',
          status: 'succeeded',
          paid_at: actualPaymentTime,
        }, { onConflict: 'user_id' });

        // Create day 1 progress
        await admin.from('challenge_progress').upsert({
          user_id: userId,
          day: 1,
          unlocked: true,
        }, { onConflict: 'user_id,day' });

        logger.log(`Auto-synced VALIDATED Stripe payment for ${userEmail}`);
      }
    } catch (err) {
      logger.error('Error checking Stripe:', err.message);
    }
  }

  // CRITICAL: If access has expired, treat as not paid (redirect to /pay)
  if (accessExpired) {
    logger.log('[GATE] Access expired - user must renew subscription');
    hasPaid = false;
  }

  // Get onboarding status (welcome_completed is in user_onboarding table)
  const { data: onboarding } = await admin
    .from('user_onboarding')
    .select('welcome_completed')
    .eq('user_id', userId)
    .maybeSingle();

  const result = {
    hasPaid,
    welcomeCompleted: !!onboarding?.welcome_completed,
    fullName: profile?.full_name || null,
    accessExpired, // Return expiration status for display/logging
    isSuspended, // User is suspended and cannot login
    suspendedUntil, // Timestamp when suspension ends
    accessExpiresAt: profile?.access_expires_at || null,
  };
  logger.log('[GATE] Final result:', JSON.stringify(result));
  return result;
}

export function determineNextRoute(gate, overrideNext) {
  // SECURITY: Validate overrideNext to prevent open redirect attacks
  // Only allow relative paths starting with / and no protocol/external URLs
  let safeNext = null;
  if (overrideNext && typeof overrideNext === 'string') {
    // Must start with / and not contain // (which could be //evil.com)
    // Also block javascript: and other protocols
    const isRelativePath = overrideNext.startsWith('/') &&
      !overrideNext.startsWith('//') &&
      !overrideNext.includes(':');
    if (isRelativePath) {
      safeNext = overrideNext;
    }
  }

  // For PAID users with override destination
  if (safeNext && gate.hasPaid && gate.welcomeCompleted) {
    return safeNext;
  }

  // UNPAID USERS: Send to payment page
  // (Trading Journal is completely separate - requires its own registration)
  if (!gate.hasPaid) {
    return '/pay';
  }

  // PAID USERS: Follow course flow
  if (!gate.welcomeCompleted) return '/welcome';
  return '/dashboard';
}

/**
 * Calculate which days are unlocked based on time since welcome_completed_at.
 * Day N unlocks when (now - welcome_completed_at) >= (N-1) * 24 hours.
 *
 * @param {string|Date} welcomeCompletedAt - The timestamp when user completed welcome
 * @param {boolean} allDaysUnlocked - If true, unlock all 30 days (admin override)
 * @returns {number[]} Array of unlocked day numbers (1-30)
 */
export function calculateUnlockedDays(welcomeCompletedAt, allDaysUnlocked = false) {
  if (allDaysUnlocked) {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }

  if (!welcomeCompletedAt) {
    return [1]; // Only day 1 if no welcome timestamp
  }

  const startTime = new Date(welcomeCompletedAt).getTime();
  const now = Date.now();
  const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);

  // Day N unlocks after (N-1) * 24 hours
  // Day 1: 0 hours (immediate)
  // Day 2: 24 hours
  // Day 3: 48 hours
  // etc.
  const maxUnlockedDay = Math.min(30, Math.floor(hoursSinceStart / 24) + 1);

  return Array.from({ length: maxUnlockedDay }, (_, i) => i + 1);
}

/**
 * Verify admin access - checks both is_admin flag AND email allowlist
 * @param {Object} user - User object with id and email
 * @returns {Promise<boolean>} True if user is admin and in allowlist
 */
export async function verifyAdminAccess(user) {
  if (!user || !user.email) {
    return false;
  }

  // Check email allowlist
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST || '';
  const allowedEmails = allowlist.split(',').map(e => e.trim().toLowerCase());

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return false;
  }

  // Check is_admin flag in database
  const admin = getServiceSupabase();
  const { data: profile } = await admin
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin === true;
}

/**
 * Get user's challenge status including time-based unlocks.
 */
export async function getUserChallengeStatus(userId) {
  const admin = getServiceSupabase();

  // Get onboarding data for welcome_completed_at
  const { data: onboarding } = await admin
    .from('user_onboarding')
    .select('welcome_completed, welcome_completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  // Get profile to check for admin unlock override
  const { data: profile } = await admin
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  // Check if user has all_days_unlocked flag in challenge_progress
  const { data: unlockOverride } = await admin
    .from('challenge_progress')
    .select('unlocked')
    .eq('user_id', userId)
    .eq('day', 30) // If day 30 is manually unlocked, all days are unlocked
    .maybeSingle();

  const allDaysUnlocked = unlockOverride?.unlocked || false;

  // Calculate time-based unlocked days
  const unlockedDays = calculateUnlockedDays(
    onboarding?.welcome_completed_at,
    allDaysUnlocked
  );

  // Get completion status
  const { data: progress } = await admin
    .from('challenge_progress')
    .select('day, completed, quiz_passed, task_submitted')
    .eq('user_id', userId);

  const completedDays = (progress || [])
    .filter(p => p.completed)
    .map(p => p.day);

  return {
    welcomeCompletedAt: onboarding?.welcome_completed_at,
    unlockedDays,
    completedDays,
    allDaysUnlocked,
  };
}
