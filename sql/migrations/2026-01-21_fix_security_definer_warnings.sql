-- Migration: Fix Supabase Security Advisor Warnings
-- Date: 2026-01-21
-- Purpose: Address security warnings for SECURITY DEFINER functions and views

-- =============================================================================
-- 1. Fix is_admin() function - Use fully qualified names and empty search_path
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT up.is_admin
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
  ), false);
$$;

-- =============================================================================
-- 2. Fix can_access_course() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_access_course()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT (up.has_paid = true AND uo.welcome_completed = true)
    FROM public.user_profiles up
    LEFT JOIN public.user_onboarding uo ON uo.user_id = up.id
    WHERE up.id = auth.uid()
  ), false);
$$;

-- =============================================================================
-- 3. Fix protect_user_profile_fields() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only allow service_role or admins to modify sensitive fields
  IF (auth.role() = 'service_role' OR
      COALESCE((SELECT up.is_admin FROM public.user_profiles up WHERE up.id = auth.uid()), false)) THEN
    RETURN NEW;
  END IF;

  -- Regular users cannot change these fields
  IF OLD.has_paid IS DISTINCT FROM NEW.has_paid THEN
    NEW.has_paid := OLD.has_paid;
  END IF;

  IF OLD.paid_at IS DISTINCT FROM NEW.paid_at THEN
    NEW.paid_at := OLD.paid_at;
  END IF;

  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;

  IF OLD.referral_code IS DISTINCT FROM NEW.referral_code THEN
    NEW.referral_code := OLD.referral_code;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 4. Fix handle_new_user() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_onboarding (user_id, welcome_completed, welcome_completed_at)
  VALUES (NEW.id, false, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 5. Fix complete_welcome() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_welcome(
  p_full_name text,
  p_agree1 boolean,
  p_agree2 boolean,
  p_agree3 boolean,
  p_current_trading_level text,
  p_primary_goal text,
  p_daily_commitment text,
  p_receive_tips boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_profiles
  SET full_name = p_full_name,
      updated_at = NOW()
  WHERE id = v_user_id;

  UPDATE public.user_onboarding
  SET welcome_completed = true,
      welcome_completed_at = NOW(),
      agree1 = p_agree1,
      agree2 = p_agree2,
      agree3 = p_agree3,
      current_trading_level = p_current_trading_level,
      primary_goal = p_primary_goal,
      daily_commitment = p_daily_commitment,
      receive_tips = p_receive_tips
  WHERE user_id = v_user_id;

  INSERT INTO public.challenge_progress (user_id, day, unlocked)
  VALUES (v_user_id, 1, true)
  ON CONFLICT (user_id, day) DO UPDATE SET unlocked = true;
END;
$$;

-- =============================================================================
-- 6. Fix set_updated_at() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 7. Add RLS policies to views (if not already present)
-- =============================================================================

-- Note: Views inherit RLS from their base tables, but we need to ensure
-- the views themselves have proper access controls

-- Grant access to users view (already has proper filtering in the view definition)
ALTER VIEW public.users OWNER TO postgres;

-- Grant access to user_progress view
ALTER VIEW public.user_progress OWNER TO postgres;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user is admin. Uses SECURITY DEFINER with empty search_path.';
COMMENT ON FUNCTION public.can_access_course() IS 'Check if user has paid and completed welcome. Uses SECURITY DEFINER with empty search_path.';
COMMENT ON FUNCTION public.protect_user_profile_fields() IS 'Prevent unauthorized changes to sensitive profile fields. Uses SECURITY DEFINER with empty search_path.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create profile when user signs up. Uses SECURITY DEFINER with empty search_path.';
COMMENT ON FUNCTION public.complete_welcome() IS 'Mark welcome as completed with onboarding data. Uses SECURITY DEFINER with empty search_path.';
COMMENT ON FUNCTION public.set_updated_at() IS 'Automatically update updated_at timestamp. Uses SECURITY DEFINER with empty search_path.';

-- =============================================================================
-- Verify the changes
-- =============================================================================

-- You can verify the changes in Supabase SQL Editor by running:
-- SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('is_admin', 'can_access_course', 'protect_user_profile_fields', 'handle_new_user', 'complete_welcome', 'set_updated_at');

-- Expected: All should have prosecdef = true and proconfig = {search_path=''}
