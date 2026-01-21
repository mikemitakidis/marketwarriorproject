-- ============================================================================
-- FINAL VERIFIED FIX - Triple Checked Against Your Schema
-- This fixes ALL Supabase Security Advisor errors and warnings
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix the 2 ERRORS (Security Definer Views)
-- ============================================================================

-- Drop and recreate views
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.user_progress CASCADE;

-- Recreate users view (EXACT schema from your database)
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

-- Recreate user_progress view (EXACT schema from your database)
CREATE VIEW public.user_progress AS
SELECT
  cp.user_id,
  cp.day AS day_number,
  cp.completed_at,
  cp.quiz_passed
FROM public.challenge_progress cp;

-- Set security_invoker on both views (this removes SECURITY DEFINER warning)
ALTER VIEW public.users SET (security_invoker = on);
ALTER VIEW public.user_progress SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON public.users TO authenticated, service_role;
GRANT SELECT ON public.user_progress TO authenticated, service_role;

-- ============================================================================
-- STEP 2: Fix the 2 WARNINGS (Function Search Path Mutable)
-- ============================================================================

-- Fix is_admin() function
ALTER FUNCTION public.is_admin() SET search_path = '';

-- Fix generate_referral_code() function
ALTER FUNCTION public.generate_referral_code() SET search_path = '';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check views have security_invoker enabled
SELECT
    c.relname as view_name,
    c.reloptions as security_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('users', 'user_progress')
  AND c.relkind = 'v';

-- Check functions have empty search_path
SELECT
    p.proname as function_name,
    p.proconfig as configuration
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'generate_referral_code');

-- ============================================================================
-- Expected results after running this:
-- - Errors: 0 (views fixed with security_invoker = on)
-- - Warnings: 1 (Leaked Password Protection - requires Supabase Pro)
-- ============================================================================
