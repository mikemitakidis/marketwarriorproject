import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

  res.setHeader('Set-Cookie', [
    cookie.serialize(COOKIE_ACCESS, '', { ...base, maxAge: 0 }),
    cookie.serialize(COOKIE_REFRESH, '', { ...base, maxAge: 0 }),
  ]);
}

export async function getGateStatus(userId, userEmail = null) {
  const admin = getServiceSupabase();

  // Get user profile
  const { data: profile } = await admin
    .from('user_profiles')
    .select('has_paid, full_name')
    .eq('id', userId)
    .maybeSingle();

  let hasPaid = !!profile?.has_paid;

  // If profile says not paid, double-check payments table
  if (!hasPaid) {
    const { data: payment } = await admin
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'succeeded')
      .maybeSingle();

    if (payment) {
      // Payment exists in DB - update profile and mark as paid
      hasPaid = true;
      await admin.from('user_profiles').upsert({
        id: userId,
        has_paid: true,
        paid_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  }

  // If still not paid and we have email, check Stripe directly
  if (!hasPaid && userEmail && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

      // Search for successful checkout sessions by customer email
      const sessions = await stripe.checkout.sessions.list({ limit: 100 });
      const userSession = sessions.data.find(
        s => s.customer_details?.email?.toLowerCase() === userEmail.toLowerCase() &&
             s.payment_status === 'paid'
      );

      if (userSession) {
        // Found payment in Stripe - sync to database
        hasPaid = true;
        const now = new Date().toISOString();

        await admin.from('user_profiles').upsert({
          id: userId,
          has_paid: true,
          paid_at: now,
        }, { onConflict: 'id' });

        await admin.from('payments').upsert({
          user_id: userId,
          stripe_session_id: userSession.id,
          amount_cents: userSession.amount_total,
          currency: userSession.currency || 'usd',
          status: 'succeeded',
          paid_at: now,
        }, { onConflict: 'user_id' });

        // Create day 1 progress
        await admin.from('challenge_progress').upsert({
          user_id: userId,
          day: 1,
          unlocked: true,
        }, { onConflict: 'user_id,day' });

        console.log(`Auto-synced Stripe payment for ${userEmail}`);
      }
    } catch (err) {
      console.error('Error checking Stripe:', err.message);
    }
  }

  // Get onboarding status (welcome_completed is in user_onboarding table)
  const { data: onboarding } = await admin
    .from('user_onboarding')
    .select('welcome_completed')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    hasPaid,
    welcomeCompleted: !!onboarding?.welcome_completed,
    fullName: profile?.full_name || null,
  };
}

export function determineNextRoute(gate, overrideNext) {
  // If override specified and user has access, use it
  if (overrideNext && gate.hasPaid && gate.welcomeCompleted) {
    return overrideNext;
  }
  // Follow the gate logic
  if (!gate.hasPaid) return '/pay';
  if (!gate.welcomeCompleted) return '/welcome';
  return '/dashboard';
}
