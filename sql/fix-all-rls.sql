-- ============================================
-- COMPREHENSIVE RLS FIX FOR MARKET WARRIOR
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- First, disable RLS temporarily to clean up
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS challenge_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promo_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trading_journal DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_journal ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_PROFILES - Users can manage their own profile
-- ============================================
CREATE POLICY "users_select_own_profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- CHALLENGE_PROGRESS - Users can manage their own progress
-- ============================================
CREATE POLICY "users_select_own_progress" ON challenge_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_progress" ON challenge_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_progress" ON challenge_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- QUIZ_RESULTS - Users can manage their own results
-- ============================================
CREATE POLICY "users_select_own_results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_results" ON quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TASK_SUBMISSIONS - Users can manage their own submissions
-- ============================================
CREATE POLICY "users_select_own_tasks" ON task_submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_tasks" ON task_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_tasks" ON task_submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- COURSE_CONTENT - Authenticated users can read
-- ============================================
CREATE POLICY "authenticated_read_content" ON course_content
    FOR SELECT TO authenticated USING (true);

-- ============================================
-- QUIZ_QUESTIONS - Authenticated users can read
-- ============================================
CREATE POLICY "authenticated_read_questions" ON quiz_questions
    FOR SELECT TO authenticated USING (true);

-- ============================================
-- PROMO_CODES - Anyone can read active codes
-- ============================================
CREATE POLICY "anyone_read_promo" ON promo_codes
    FOR SELECT USING (is_active = true);

-- ============================================
-- ANNOUNCEMENTS - Anyone can read active announcements
-- ============================================
CREATE POLICY "anyone_read_announcements" ON announcements
    FOR SELECT USING (is_active = true);

-- ============================================
-- PAYMENTS - Users can see their own payments
-- ============================================
CREATE POLICY "users_select_own_payments" ON payments
    FOR SELECT USING (email = (SELECT email FROM user_profiles WHERE user_id = auth.uid()));

-- ============================================
-- REFERRALS - Users can see referrals they made
-- ============================================
CREATE POLICY "users_select_own_referrals" ON referrals
    FOR SELECT USING (referrer_user_id = auth.uid());

-- ============================================
-- TRADING_JOURNAL - Users can manage their own journal
-- ============================================
CREATE POLICY "users_all_own_journal" ON trading_journal
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- JOURNAL_LEADS - Anyone can insert (public signup)
-- ============================================
CREATE POLICY "anyone_insert_leads" ON journal_leads
    FOR INSERT WITH CHECK (true);

-- ============================================
-- SITE_SETTINGS - Read only for everyone
-- ============================================
CREATE POLICY "anyone_read_settings" ON site_settings
    FOR SELECT USING (true);

-- ============================================
-- ACTIVITY_LOG - Users can see their own activity
-- ============================================
CREATE POLICY "users_select_own_activity" ON activity_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_activity" ON activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Add unique constraint for challenge_progress if missing
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'challenge_progress_user_day_unique'
    ) THEN
        ALTER TABLE challenge_progress 
        ADD CONSTRAINT challenge_progress_user_day_unique 
        UNIQUE (user_id, day_number);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- ============================================
-- Done! All RLS policies are now configured.
-- ============================================
SELECT 'RLS policies configured successfully!' as status;
