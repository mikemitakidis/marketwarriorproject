-- Add last_login column to user_profiles for tracking user activity
-- Used by the email-checks cron job to detect 7-day inactivity

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Backfill: set last_login to paid_at for existing paid users (so they don't
-- immediately get flagged as inactive)
UPDATE user_profiles
SET last_login = COALESCE(paid_at, created_at)
WHERE last_login IS NULL AND has_paid = true;
