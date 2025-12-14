-- ============================================
-- MARKET WARRIOR - COMPLETE SECURITY SETUP
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Drop all existing policies first
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trading_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_leads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_PROFILES - Own profile only
-- ============================================
CREATE POLICY "users_read_own_profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert handled by service role only (signup API)

-- ============================================
-- CHALLENGE_PROGRESS - P0.7 FIX: Server-controlled writes
-- Users can only READ their own progress
-- Writes must go through API (service role)
-- ============================================
CREATE POLICY "users_read_own_progress" ON challenge_progress
    FOR SELECT USING (auth.uid() = user_id);

-- NO INSERT/UPDATE policy for authenticated users
-- All writes go through server API with service role

-- ============================================
-- QUIZ_RESULTS - Read only for users
-- ============================================
CREATE POLICY "users_read_own_results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);

-- Inserts through API only

-- ============================================
-- TASK_SUBMISSIONS - Users can read own, submit through API
-- ============================================
CREATE POLICY "users_read_own_tasks" ON task_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- COURSE_CONTENT - P0.3 FIX: Authenticated users with valid access only
-- Note: API adds additional checks for payment/expiry
-- ============================================
CREATE POLICY "paid_users_read_content" ON course_content
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND has_paid = true 
            AND agreed_to_terms = true
            AND (access_expires_at IS NULL OR access_expires_at > NOW())
        )
    );

-- ============================================
-- QUIZ_QUESTIONS - P0.1 FIX: Hide correct_answer column
-- Create a view that excludes correct_answer for client access
-- ============================================
-- First, revoke direct table access
REVOKE ALL ON quiz_questions FROM authenticated;
REVOKE ALL ON quiz_questions FROM anon;

-- Grant to service role only
GRANT ALL ON quiz_questions TO service_role;

-- Create safe view without correct_answer
DROP VIEW IF EXISTS quiz_questions_safe;
CREATE VIEW quiz_questions_safe AS
SELECT id, day_number, question, options, question_order
FROM quiz_questions;

-- Grant select on safe view to authenticated users
GRANT SELECT ON quiz_questions_safe TO authenticated;

-- Policy for the safe view
ALTER VIEW quiz_questions_safe SET (security_invoker = on);

-- ============================================
-- PAYMENTS - Service role only (no public access)
-- ============================================
-- No policies = no access except service role

-- ============================================
-- PROMO_CODES - Read active codes only
-- ============================================
CREATE POLICY "read_active_promos" ON promo_codes
    FOR SELECT USING (is_active = true);

-- ============================================
-- ANNOUNCEMENTS - Read active only
-- ============================================
CREATE POLICY "read_active_announcements" ON announcements
    FOR SELECT USING (is_active = true);

-- ============================================
-- TRADING_JOURNAL - Users own their entries
-- ============================================
CREATE POLICY "users_all_own_journal" ON trading_journal
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- ACTIVITY_LOG - Read own, insert through API
-- ============================================
CREATE POLICY "users_read_own_activity" ON activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- REFERRALS - Users see their referrals
-- ============================================
CREATE POLICY "users_read_own_referrals" ON referrals
    FOR SELECT USING (referrer_user_id = auth.uid());

-- ============================================
-- SITE_SETTINGS - Public read
-- ============================================
CREATE POLICY "public_read_settings" ON site_settings
    FOR SELECT USING (true);

-- ============================================
-- JOURNAL_LEADS - Public insert (signup form)
-- ============================================
CREATE POLICY "public_insert_leads" ON journal_leads
    FOR INSERT WITH CHECK (true);

-- ============================================
-- CONSTRAINTS
-- ============================================
ALTER TABLE challenge_progress DROP CONSTRAINT IF EXISTS challenge_progress_user_day_unique;
ALTER TABLE challenge_progress ADD CONSTRAINT challenge_progress_user_day_unique 
    UNIQUE (user_id, day_number);

ALTER TABLE task_submissions DROP CONSTRAINT IF EXISTS task_submissions_user_day_unique;
ALTER TABLE task_submissions ADD CONSTRAINT task_submissions_user_day_unique 
    UNIQUE (user_id, day_number);

-- ============================================
-- HELPER FUNCTION: Increment promo usage
-- ============================================
CREATE OR REPLACE FUNCTION increment_promo_usage(code_to_update TEXT)
RETURNS void AS $$
BEGIN
    UPDATE promo_codes 
    SET current_uses = current_uses + 1 
    WHERE code = code_to_update;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================
SELECT 'Security setup complete!' as status;
