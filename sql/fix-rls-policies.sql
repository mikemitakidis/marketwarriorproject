-- ============================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- This fixes the "Email not confirmed" and "Database error" issues
-- ============================================

-- ============================================
-- PART 1: FIX USER_PROFILES RLS
-- ============================================

-- First, drop existing policies if they exist (to recreate clean)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON user_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- Make sure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own profile (but not all fields)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: No INSERT policy for anon users - inserts happen via service key

-- ============================================
-- PART 2: FIX REFERRALS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view referrals they made" ON referrals;

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can see referrals where they are the referrer
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

-- ============================================
-- PART 3: FIX QUIZ_RESULTS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Users can insert own quiz results" ON quiz_results;

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz results" ON quiz_results
  FOR SELECT USING (auth.uid() = user_id);

-- Quiz results are inserted via service key, not user

-- ============================================
-- PART 4: FIX CHALLENGE_PROGRESS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own progress" ON challenge_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON challenge_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON challenge_progress;

ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 5: FIX TASK_SUBMISSIONS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own tasks" ON task_submissions;
DROP POLICY IF EXISTS "Users can insert own tasks" ON task_submissions;

ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON task_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON task_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 6: FIX PAYMENTS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own payments" ON payments;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- PART 7: COURSE_CONTENT & QUIZ_QUESTIONS - PUBLIC READ
-- ============================================

DROP POLICY IF EXISTS "Anyone can read course content" ON course_content;
DROP POLICY IF EXISTS "Anyone can read quiz questions" ON quiz_questions;

ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read course content" ON course_content
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read quiz questions" ON quiz_questions
  FOR SELECT USING (true);

-- ============================================
-- PART 8: ANNOUNCEMENTS - PUBLIC READ
-- ============================================

DROP POLICY IF EXISTS "Anyone can read announcements" ON announcements;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcements" ON announcements
  FOR SELECT USING (is_active = true);

-- ============================================
-- DONE! The service key (used in API routes) bypasses all RLS
-- ============================================
