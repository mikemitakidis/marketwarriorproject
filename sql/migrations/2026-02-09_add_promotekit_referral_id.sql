-- Add promotekit_referral_id column to user_profiles
-- This stores the PromoteKit referral ID from Stripe checkout metadata
-- for server-side affiliate attribution backup
-- PromoteKit handles tracking client-side, but this provides a reliable backup

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS promotekit_referral_id TEXT;

-- Index for lookup by referral ID (for affiliate reporting)
CREATE INDEX IF NOT EXISTS idx_user_profiles_promotekit_referral
  ON user_profiles(promotekit_referral_id)
  WHERE promotekit_referral_id IS NOT NULL;

-- Update the protect trigger to NOT block updates to promotekit_referral_id
-- (The existing protect trigger blocks has_paid, is_admin changes from non-service-role,
--  but promotekit_referral_id should also be updatable by service role only)
-- No changes needed to trigger since it only blocks specific fields.
