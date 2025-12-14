-- =============================================
-- RLS FIX SCRIPT - Run this in Supabase SQL Editor
-- This fixes the security issues identified
-- =============================================

-- STEP 1: Add INSERT policy for user_profiles (fixes "Terms showing again" bug)
-- Check if policy exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- STEP 2: Add service role bypass for user_profiles (for admin operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to profiles' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY "Service role full access to profiles" ON user_profiles
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- STEP 3: Enable RLS on course_content (CRITICAL SECURITY FIX)
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;

-- Drop any permissive policies that might exist
DROP POLICY IF EXISTS "Public can read course content" ON course_content;
DROP POLICY IF EXISTS "Anyone can read course content" ON course_content;

-- Only service role can access course content
-- Students must use /api/day/[day] which checks paid + unlock status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage course content' AND tablename = 'course_content'
  ) THEN
    CREATE POLICY "Service role can manage course content" ON course_content
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- STEP 4: Fix promo_codes RLS (ensure only service role can modify)
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active promos" ON promo_codes;
DROP POLICY IF EXISTS "Public read active promos" ON promo_codes;

-- Public can only read active promo codes (for validation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can validate active promos' AND tablename = 'promo_codes'
  ) THEN
    CREATE POLICY "Public can validate active promos" ON promo_codes
      FOR SELECT USING (is_active = TRUE);
  END IF;
END
$$;

-- Service role can manage all promo codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages promos' AND tablename = 'promo_codes'
  ) THEN
    CREATE POLICY "Service role manages promos" ON promo_codes
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- STEP 5: Fix affiliates RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own affiliate record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own affiliate' AND tablename = 'affiliates'
  ) THEN
    CREATE POLICY "Users can view own affiliate" ON affiliates
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Service role can manage all affiliates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages affiliates' AND tablename = 'affiliates'
  ) THEN
    CREATE POLICY "Service role manages affiliates" ON affiliates
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- STEP 6: Fix referrals RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can only see referrals where they are the referrer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own referrals' AND tablename = 'referrals'
  ) THEN
    CREATE POLICY "Users can view own referrals" ON referrals
      FOR SELECT USING (auth.uid() = referrer_user_id);
  END IF;
END
$$;

-- Service role can manage all referrals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages referrals' AND tablename = 'referrals'
  ) THEN
    CREATE POLICY "Service role manages referrals" ON referrals
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- STEP 7: Verify RLS is enabled on all critical tables
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED - SECURITY RISK!' END as rls_status
FROM pg_tables
LEFT JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles', 
    'course_content', 
    'challenge_progress',
    'quiz_results',
    'task_submissions',
    'payments',
    'promo_codes',
    'affiliates',
    'referrals',
    'activity_log',
    'device_fingerprints',
    'certificates',
    'trading_journal',
    'live_feed'
  )
ORDER BY tablename;

-- Done! Check the results above to ensure all tables show "ENABLED"
