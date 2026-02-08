-- Fix protect_user_profile_fields() trigger
--
-- Problem: The 2026-01-21 migration deployed a broken version that:
--   1. Referenced non-existent 'referral_code' instead of 'affiliate_code'
--   2. Only protected 4 fields instead of 9
--   3. Silently reverted changes instead of raising an exception
--
-- This restores the correct version from the full schema.

CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the row-owner updates their profile, block sensitive fields.
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id AND public.is_admin() = false THEN
    IF NEW.has_paid IS DISTINCT FROM OLD.has_paid
      OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
      OR NEW.access_revoked_at IS DISTINCT FROM OLD.access_revoked_at
      OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.last_payment_intent_id IS DISTINCT FROM OLD.last_payment_intent_id
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.affiliate_role IS DISTINCT FROM OLD.affiliate_role
      OR NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code
      OR NEW.referred_by_user_id IS DISTINCT FROM OLD.referred_by_user_id
    THEN
      RAISE EXCEPTION 'You are not allowed to modify protected profile fields.';
    END IF;
  END IF;

  -- Certificate name lock: once locked, cannot change full_name
  IF OLD.full_name_locked = true AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'Full name is locked and cannot be changed.';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the unused referral_code column (was never in the original schema)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS referral_code;
