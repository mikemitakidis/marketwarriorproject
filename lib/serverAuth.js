const cookie = require('cookie');
const { createClient } = require('@supabase/supabase-js');

const COOKIE_ACCESS = 'mw_at';
const COOKIE_REFRESH = 'mw_rt';

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key);
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key);
}

function readTokens(req) {
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const accessToken = auth.substring(7);
    return { accessToken, refreshToken: null };
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  return { accessToken: cookies[COOKIE_ACCESS] || null, refreshToken: cookies[COOKIE_REFRESH] || null };
}

async function getUserFromRequest(req) {
  const { accessToken } = readTokens(req);
  if (!accessToken) return null;

  const supabase = getAnonSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

function setAuthCookies(res, session) {
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

function clearAuthCookies(res) {
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

async function getGateStatus(userId) {
  const admin = getServiceSupabase();

  // Get user profile
  const { data: profile } = await admin
    .from('user_profiles')
    .select('has_paid, full_name')
    .eq('id', userId)
    .maybeSingle();

  // Get onboarding status (welcome_completed is in user_onboarding table)
  const { data: onboarding } = await admin
    .from('user_onboarding')
    .select('welcome_completed')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    hasPaid: !!profile?.has_paid,
    welcomeCompleted: !!onboarding?.welcome_completed,
    fullName: profile?.full_name || null,
  };
}

function determineNextRoute(gate) {
  if (!gate.hasPaid) return '/pay';
  if (!gate.welcomeCompleted) return '/welcome';
  return '/dashboard';
}

module.exports = {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  getAnonSupabase,
  getServiceSupabase,
  readTokens,
  getUserFromRequest,
  setAuthCookies,
  clearAuthCookies,
  getGateStatus,
  determineNextRoute,
};
