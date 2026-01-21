-- Migration: Add 120-day access expiration with unlimited override
-- Date: 2026-01-21
-- Purpose: Implement 120-day access rule with admin override capability

-- Add unlimited_access flag to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS unlimited_access boolean NOT NULL DEFAULT false;

-- Add index for faster access checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_paid_at ON public.user_profiles(paid_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_unlimited_access ON public.user_profiles(unlimited_access);

-- Add comment
COMMENT ON COLUMN public.user_profiles.unlimited_access IS 'Admin override: grants unlimited access beyond 120 days';

-- Grant permission for admins to modify this field
-- (Already protected by RLS and admin checks)
