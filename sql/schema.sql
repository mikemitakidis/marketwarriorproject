-- Market Warrior Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USER PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_paid BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  agreed_to_terms BOOLEAN DEFAULT FALSE,
  terms_agreed_at TIMESTAMPTZ,
  challenge_start_date TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  device_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- COURSE CONTENT
-- =====================
CREATE TABLE IF NOT EXISTS course_content (
  id SERIAL PRIMARY KEY,
  day_number INTEGER UNIQUE NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  title TEXT NOT NULL,
  content_html TEXT,
  youtube_video_id TEXT,
  has_video BOOLEAN DEFAULT TRUE,
  quiz_questions JSONB DEFAULT '[]'::JSONB,
  quiz_answers JSONB DEFAULT '[]'::JSONB, -- Server-only, never sent to client
  task_instructions TEXT,
  task_type TEXT DEFAULT 'text', -- 'text', 'file', 'both'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CHALLENGE PROGRESS
-- =====================
CREATE TABLE IF NOT EXISTS challenge_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  quiz_completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER,
  quiz_passed BOOLEAN DEFAULT FALSE,
  task_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_number)
);

-- =====================
-- QUIZ RESULTS (detailed attempts)
-- =====================
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  answers_submitted JSONB NOT NULL,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TASK SUBMISSIONS
-- =====================
CREATE TABLE IF NOT EXISTS task_submissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  task_text TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PAYMENTS
-- =====================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  promo_code TEXT,
  affiliate_code TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PROMO CODES
-- =====================
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER CHECK (discount_percent BETWEEN 1 AND 100),
  discount_amount DECIMAL(10,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AFFILIATES
-- =====================
CREATE TABLE IF NOT EXISTS affiliates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  affiliate_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(3,2) DEFAULT 0.30, -- 30% default
  total_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  pending_earnings DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- REFERRALS
-- =====================
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES user_profiles(id),
  referred_user_id UUID REFERENCES user_profiles(id),
  referred_email TEXT,
  commission_earned DECIMAL(10,2),
  commission_rate DECIMAL(3,2),
  status TEXT DEFAULT 'pending', -- 'pending', 'converted', 'paid'
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ANNOUNCEMENTS / LIVE FEED
-- =====================
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success'
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ACTIVITY LOG
-- =====================
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SITE SETTINGS
-- =====================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('course_price', '{"amount": 3999, "currency": "usd", "display": "$39.99"}'),
  ('stripe_price_id', '{"value": ""}'),
  ('access_duration_days', '{"value": 120}'),
  ('quiz_pass_threshold', '{"value": 60}')
ON CONFLICT (key) DO NOTHING;

-- =====================
-- DEVICE FINGERPRINTS (fraud prevention)
-- =====================
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fingerprint)
);

-- =====================
-- EMAIL LOGS
-- =====================
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- User profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Challenge progress: users can read/write their own
CREATE POLICY "Users can view own progress" ON challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Quiz results: users can view their own
CREATE POLICY "Users can view own quiz results" ON quiz_results
  FOR SELECT USING (auth.uid() = user_id);

-- Task submissions: users can view/insert their own
CREATE POLICY "Users can view own submissions" ON task_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions" ON task_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments: users can view their own
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Course content: NO public access (served via API only)
-- Admin access via service role key

-- Promo codes: public can validate (read) active codes
CREATE POLICY "Anyone can read active promo codes" ON promo_codes
  FOR SELECT USING (is_active = TRUE);

-- Announcements: public can read active
CREATE POLICY "Anyone can read active announcements" ON announcements
  FOR SELECT USING (is_active = TRUE);

-- =====================
-- FUNCTIONS
-- =====================

-- Function to increment affiliate stats
CREATE OR REPLACE FUNCTION increment_affiliate_stats(
  p_affiliate_id INTEGER,
  p_commission DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET 
    total_referrals = total_referrals + 1,
    total_earnings = total_earnings + p_commission,
    pending_earnings = pending_earnings + p_commission
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check day unlock status
CREATE OR REPLACE FUNCTION check_day_unlock(
  p_user_id UUID,
  p_day_number INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_prev_completed BOOLEAN;
  v_is_unlocked BOOLEAN;
  v_unlock_time TIMESTAMPTZ;
BEGIN
  -- Get user's challenge start date
  SELECT challenge_start_date INTO v_start_date
  FROM user_profiles WHERE id = p_user_id;
  
  IF v_start_date IS NULL THEN
    RETURN jsonb_build_object('unlocked', FALSE, 'reason', 'Challenge not started');
  END IF;
  
  -- Day 1 is always unlocked after start
  IF p_day_number = 1 THEN
    RETURN jsonb_build_object('unlocked', TRUE);
  END IF;
  
  -- Check if previous day is completed
  SELECT (quiz_passed AND task_completed) INTO v_prev_completed
  FROM challenge_progress
  WHERE user_id = p_user_id AND day_number = p_day_number - 1;
  
  IF NOT COALESCE(v_prev_completed, FALSE) THEN
    RETURN jsonb_build_object('unlocked', FALSE, 'reason', 'Complete previous day first');
  END IF;
  
  -- Check if enough time has passed (24 hours per day)
  v_unlock_time := v_start_date + (INTERVAL '24 hours' * (p_day_number - 1));
  v_is_unlocked := NOW() >= v_unlock_time;
  
  IF v_is_unlocked THEN
    RETURN jsonb_build_object('unlocked', TRUE);
  ELSE
    RETURN jsonb_build_object(
      'unlocked', FALSE,
      'reason', 'Time lock',
      'unlocks_at', v_unlock_time
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_challenge_progress_updated_at
  BEFORE UPDATE ON challenge_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_course_content_updated_at
  BEFORE UPDATE ON course_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_day ON challenge_progress(day_number);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- =============================================
-- CERTIFICATES TABLE (if not already created)
-- =============================================
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_id TEXT UNIQUE NOT NULL,
    issued_to_name TEXT NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON certificates(certificate_id);

-- RLS for certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
    ON certificates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage certificates"
    ON certificates FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================
-- STORAGE BUCKET FOR USER UPLOADS
-- =============================================
-- Run this in Supabase SQL editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-uploads', 'user-uploads', true);

-- Storage policy for user uploads
-- CREATE POLICY "Users can upload to their folder"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'user-uploads' AND (storage.foldername(name))[1] = 'tasks' AND (storage.foldername(name))[2] = auth.uid()::text);

-- =============================================
-- TRADING JOURNAL TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS trading_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    trade_type TEXT DEFAULT 'long' CHECK (trade_type IN ('long', 'short')),
    entry_price DECIMAL(18,4),
    exit_price DECIMAL(18,4),
    quantity DECIMAL(18,4),
    pnl DECIMAL(18,2),
    entry_date DATE,
    exit_date DATE,
    strategy TEXT,
    notes TEXT,
    emotions TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_user ON trading_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON trading_journal(entry_date DESC);

-- RLS for trading journal
ALTER TABLE trading_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own journal entries"
    ON trading_journal FOR ALL
    USING (auth.uid() = user_id);

-- =============================================
-- LIVE FEED TABLE (Admin announcements)
-- =============================================
CREATE TABLE IF NOT EXISTS live_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    link_url TEXT,
    link_text TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_feed_active ON live_feed(is_active, created_at DESC);

-- RLS for live feed (public read, admin write)
ALTER TABLE live_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active feed items"
    ON live_feed FOR SELECT
    USING (is_active = true);

CREATE POLICY "Service role can manage feed"
    ON live_feed FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================
-- JOURNAL LEADS TABLE (Lead magnet signups)
-- =============================================
CREATE TABLE IF NOT EXISTS journal_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    source TEXT DEFAULT 'website',
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journal_leads_email ON journal_leads(email);

-- =============================================
-- EMAIL CAMPAIGNS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    audience TEXT NOT NULL,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'sent',
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_date ON email_campaigns(sent_at DESC);

-- RLS for email campaigns (admin only)
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage campaigns"
    ON email_campaigns FOR ALL
    USING (auth.role() = 'service_role');
