-- ============================================================================
-- FIX: Security Definer Views Only
-- This fixes the 2 ERRORS, leaves function warnings as-is per your schema
-- ============================================================================

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.user_progress CASCADE;

-- Recreate users view (exact schema from COMPLETE_FRESH_INSTALL.sql)
CREATE VIEW public.users AS
SELECT
  up.id,
  up.email,
  up.full_name,
  up.has_paid,
  uo.welcome_completed AS agreed_to_terms,
  uo.welcome_completed_at AS terms_agreed_at,
  uo.welcome_completed_at AS challenge_start_date,
  true AS cookies_consent,
  uo.welcome_completed_at AS cookies_consent_date,
  NULL::text AS stripe_session_id,
  up.created_at
FROM public.user_profiles up
JOIN public.user_onboarding uo ON uo.user_id = up.id;

-- Recreate user_progress view (exact schema from COMPLETE_FRESH_INSTALL.sql)
CREATE VIEW public.user_progress AS
SELECT
  cp.user_id,
  cp.day AS day_number,
  cp.completed_at,
  cp.quiz_passed
FROM public.challenge_progress cp;

-- Set security_invoker = on to prevent SECURITY DEFINER errors
ALTER VIEW public.users SET (security_invoker = on);
ALTER VIEW public.user_progress SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON public.users TO authenticated, service_role;
GRANT SELECT ON public.user_progress TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT
    c.relname as view_name,
    c.reloptions as security_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'user_progress')
  AND c.relkind = 'v';

-- ============================================================================
-- Expected result after running this:
-- - 2 Errors FIXED (views now use security_invoker)
-- - 3 Warnings remain:
--   * is_admin() function (search_path = public, as designed)
--   * generate_referral_code() function (if it exists in your DB)
--   * Leaked Password Protection (requires Supabase Pro)
-- ============================================================================
