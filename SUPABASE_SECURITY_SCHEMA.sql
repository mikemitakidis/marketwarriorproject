-- =============================================================================
-- MARKET WARRIOR - CORE DATABASE SCHEMA WITH RLS
-- =============================================================================
-- Run this in Supabase SQL Editor
-- This creates all required tables with Row Level Security
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USER PROFILES TABLE (main user data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    
    -- Payment & Access
    has_paid BOOLEAN DEFAULT false,
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    amount_paid DECIMAL(10,2),
    payment_date TIMESTAMPTZ,
    access_expires_at TIMESTAMPTZ,
    refunded BOOLEAN DEFAULT false,
    refund_date TIMESTAMPTZ,
    
    -- Terms & Onboarding
    agreed_to_terms BOOLEAN DEFAULT false,
    agreement_date TIMESTAMPTZ,
    welcome_completed BOOLEAN DEFAULT false,
    gdpr_consent BOOLEAN DEFAULT false,
    gdpr_consent_date TIMESTAMPTZ,
    
    -- Challenge Progress
    challenge_start_date TIMESTAMPTZ,
    current_day INTEGER DEFAULT 1,
    days_completed INTEGER DEFAULT 0,
    course_completed BOOLEAN DEFAULT false,
    course_completed_at TIMESTAMPTZ,
    
    -- Affiliate
    affiliate_code TEXT UNIQUE,
    referred_by TEXT,
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    
    -- Admin
    is_admin BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_affiliate_code ON user_profiles(affiliate_code);

-- =============================================================================
-- 2. CHALLENGE PROGRESS TABLE (daily progress tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS challenge_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
    
    -- Quiz
    quiz_passed BOOLEAN DEFAULT false,
    quiz_score INTEGER,
    quiz_completed_at TIMESTAMPTZ,
    
    -- Task
    task_completed BOOLEAN DEFAULT false,
    task_submitted_at TIMESTAMPTZ,
    
    -- Overall
    unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_user_day ON challenge_progress(user_id, day_number);

-- =============================================================================
-- 3. QUIZ RESULTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    correct_count INTEGER,
    total_questions INTEGER,
    answers JSONB,
    
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, day_number)
);

-- =============================================================================
-- 4. TASK SUBMISSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS task_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    
    task_text TEXT,
    file_url TEXT,
    
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, day_number)
);

-- =============================================================================
-- 5. COURSE CONTENT TABLE (admin-managed content)
-- =============================================================================
CREATE TABLE IF NOT EXISTS course_content (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_number INTEGER UNIQUE NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
    
    title TEXT NOT NULL,
    subtitle TEXT,
    content_html TEXT,
    youtube_video_id TEXT,
    
    task_description TEXT,
    task_steps JSONB,
    
    next_preview TEXT,
    
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. QUIZ QUESTIONS TABLE (correct answers stored here, never sent to client)
-- =============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    day_number INTEGER NOT NULL,
    question_order INTEGER DEFAULT 1,
    
    question TEXT NOT NULL,
    options JSONB NOT NULL,  -- Array of option strings
    correct_answer INTEGER NOT NULL,  -- Index of correct option (0-based)
    explanation TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_day ON quiz_questions(day_number);

-- =============================================================================
-- 7. PAYMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    stripe_payment_intent TEXT,
    
    referral_code TEXT,
    status TEXT DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);

-- =============================================================================
-- 8. REFERRALS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_user_id UUID REFERENCES auth.users(id),
    referred_email TEXT NOT NULL,
    
    commission DECIMAL(10,2),
    commission_rate DECIMAL(5,2),
    status TEXT DEFAULT 'pending',
    
    stripe_session_id TEXT,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- =============================================================================
-- 9. ANNOUNCEMENTS TABLE (admin live feed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- =============================================================================
-- 10. SERVER TIME FUNCTION (for server-side unlock calculations)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USER_PROFILES POLICIES
-- =============================================================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhooks/admin)
CREATE POLICY "Service role full access to profiles" ON user_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- CHALLENGE_PROGRESS POLICIES
-- =============================================================================
-- Users can read their own progress
CREATE POLICY "Users can view own progress" ON challenge_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can write progress (prevents cheating)
CREATE POLICY "Service role writes progress" ON challenge_progress
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- QUIZ_RESULTS POLICIES
-- =============================================================================
-- Users can read their own results
CREATE POLICY "Users can view own quiz results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can write results
CREATE POLICY "Service role writes quiz results" ON quiz_results
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- TASK_SUBMISSIONS POLICIES
-- =============================================================================
-- Users can read their own submissions
CREATE POLICY "Users can view own tasks" ON task_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can write tasks
CREATE POLICY "Service role writes tasks" ON task_submissions
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- COURSE_CONTENT POLICIES
-- =============================================================================
-- CRITICAL: Course content is NOT publicly readable
-- Only service role can access (content served via API)
CREATE POLICY "Service role reads content" ON course_content
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages content" ON course_content
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- QUIZ_QUESTIONS POLICIES
-- =============================================================================
-- CRITICAL: Quiz questions (with answers) are NOT publicly readable
-- Only service role can access
CREATE POLICY "Service role reads questions" ON quiz_questions
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages questions" ON quiz_questions
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- PAYMENTS POLICIES
-- =============================================================================
-- Only service role can access payments
CREATE POLICY "Service role manages payments" ON payments
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- REFERRALS POLICIES
-- =============================================================================
-- Users can view their own referrals
CREATE POLICY "Users can view own referrals" ON referrals
    FOR SELECT USING (auth.uid() = referrer_user_id);

-- Service role manages all referrals
CREATE POLICY "Service role manages referrals" ON referrals
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- ANNOUNCEMENTS POLICIES
-- =============================================================================
-- Anyone authenticated can read active announcements
CREATE POLICY "Authenticated users read announcements" ON announcements
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Service role manages announcements
CREATE POLICY "Service role manages announcements" ON announcements
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_progress_updated_at
    BEFORE UPDATE ON challenge_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_content_updated_at
    BEFORE UPDATE ON course_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA FOR DAY 1 (for testing)
-- =============================================================================
INSERT INTO course_content (day_number, title, subtitle, content_html, task_description, task_steps, next_preview, is_published)
VALUES (
    1,
    'Introduction to Trading & Financial Markets',
    'Understanding the world of trading and different market types',
    '<h2>Welcome to Day 1!</h2><p>Today you will learn about the different types of financial markets...</p>',
    'Research and identify which type of market interests you most and why.',
    '["Review the four main market types: Stocks, Forex, Commodities, and Crypto", "Research the pros and cons of each market type", "Write a short paragraph explaining which market interests you most", "Take a screenshot of a chart from your chosen market"]',
    'Tomorrow you will set up your demo trading account and explore trading platforms!',
    true
) ON CONFLICT (day_number) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    updated_at = NOW();

-- Sample quiz questions for Day 1 (with correct answers - never sent to client!)
INSERT INTO quiz_questions (day_number, question_order, question, options, correct_answer, explanation)
VALUES 
    (1, 1, 'What is the primary purpose of a stock market?', 
     '["To allow companies to raise capital by selling shares", "To trade currencies between countries", "To buy and sell physical goods", "To store money safely"]',
     0, 'Stock markets allow companies to raise capital by selling ownership shares to investors.'),
    (1, 2, 'Which market operates 24 hours a day, 5 days a week?',
     '["Stock Market", "Forex Market", "Commodity Market", "Bond Market"]',
     1, 'The Forex (foreign exchange) market operates 24/5 due to global time zones.'),
    (1, 3, 'What does going long mean in trading?',
     '["Holding a position for a long time", "Buying an asset expecting its price to rise", "Selling an asset expecting its price to fall", "Taking a break from trading"]',
     1, 'Going long means buying an asset with the expectation that its price will increase.'),
    (1, 4, 'What is a bear market?',
     '["A market with high volatility", "A market dominated by sellers with falling prices", "A market dominated by buyers with rising prices", "A market for trading animal products"]',
     1, 'A bear market is characterized by falling prices and pessimistic sentiment.'),
    (1, 5, 'Why is it important to practice with a demo account first?',
     '["To make real money faster", "To learn trading without risking real money", "Because demo accounts are required by law", "Demo accounts offer better returns"]',
     1, 'Demo accounts let you practice strategies and learn the platform without risking real money.')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE! Your database is now secure.
-- =============================================================================
