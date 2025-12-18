-- =============================================
-- MARKET WARRIOR - COMPLETE FRESH INSTALL
-- =============================================
-- This script:
-- 1. Deletes ALL existing tables (old and new names)
-- 2. Creates all tables from scratch
-- 3. Sets up security policies
--
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE script
-- 2. Paste into Supabase SQL Editor
-- 3. Click "Run"
-- =============================================

-- =============================================
-- PART 1: DELETE EVERYTHING
-- =============================================

-- Drop all views
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.user_progress CASCADE;

-- Drop NEW schema tables
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;
DROP TABLE IF EXISTS public.live_feed_signals CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_referrals CASCADE;
DROP TABLE IF EXISTS public.affiliate_settings CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.task_submissions CASCADE;
DROP TABLE IF EXISTS public.challenge_progress CASCADE;
DROP TABLE IF EXISTS public.course_content CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.stripe_events CASCADE;
DROP TABLE IF EXISTS public.trading_journal_entries CASCADE;
DROP TABLE IF EXISTS public.leads_journal_entries CASCADE;
DROP TABLE IF EXISTS public.user_onboarding CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- Drop OLD schema tables (from previous developer)
DROP TABLE IF EXISTS public.affiliate_profiles CASCADE;
DROP TABLE IF EXISTS public.leads_journal CASCADE;
DROP TABLE IF EXISTS public.quiz_results CASCADE;
DROP TABLE IF EXISTS public.trading_journal CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_course() CASCADE;
DROP FUNCTION IF EXISTS public.protect_user_profile_fields() CASCADE;
DROP FUNCTION IF EXISTS public.complete_welcome(text,boolean,boolean,boolean,boolean,boolean,text,text) CASCADE;

-- =============================================
-- PART 2: CREATE EXTENSION
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- PART 3: CREATE HELPER FUNCTION (updated_at)
-- =============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- =============================================
-- PART 4: CREATE ALL TABLES
-- =============================================

-- User profiles (core user data)
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  full_name_locked boolean NOT NULL DEFAULT false,
  has_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  access_revoked_at timestamptz,
  stripe_customer_id text,
  last_payment_intent_id text,
  is_admin boolean NOT NULL DEFAULT false,
  affiliate_role text NOT NULL DEFAULT 'none' CHECK (affiliate_role IN ('none','affiliate_only','paid_member')),
  affiliate_code text UNIQUE,
  referred_by_code text,
  referred_by_user_id uuid REFERENCES public.user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- User onboarding (welcome page checkboxes)
CREATE TABLE public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  agree1 boolean NOT NULL DEFAULT false,
  agree2 boolean NOT NULL DEFAULT false,
  agree3 boolean NOT NULL DEFAULT false,
  agree4 boolean NOT NULL DEFAULT false,
  agree5 boolean NOT NULL DEFAULT false,
  welcome_completed boolean NOT NULL DEFAULT false,
  welcome_completed_at timestamptz,
  terms_version text,
  privacy_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_onboarding_updated_at
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Course content (Day 1-30 lessons)
CREATE TABLE public.course_content (
  day int PRIMARY KEY,
  title text,
  html_content text,
  video_url text,
  task_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_course_content_updated_at
BEFORE UPDATE ON public.course_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Challenge progress (tracks user progress per day)
CREATE TABLE public.challenge_progress (
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  day int NOT NULL REFERENCES public.course_content(day) ON DELETE CASCADE,
  unlocked boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  quiz_passed boolean NOT NULL DEFAULT false,
  task_submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE TRIGGER trg_challenge_progress_updated_at
BEFORE UPDATE ON public.challenge_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Task submissions
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  day int NOT NULL REFERENCES public.course_content(day) ON DELETE CASCADE,
  submission_text text,
  attachment_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','approved','rejected')),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_task_submissions_updated_at
BEFORE UPDATE ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_task_submissions_user_day ON public.task_submissions(user_id, day);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day int NOT NULL REFERENCES public.course_content(day) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 1,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_option text NOT NULL,
  explanation text,
  points int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_quiz_questions_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_quiz_questions_day ON public.quiz_questions(day);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  day int NOT NULL REFERENCES public.course_content(day) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score int NOT NULL DEFAULT 0,
  max_score int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_quiz_attempts_updated_at
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_quiz_attempts_user_day ON public.quiz_attempts(user_id, day);

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  stripe_session_id text,
  payment_intent_id text,
  amount_cents int,
  currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','refunded','failed')),
  paid_at timestamptz,
  refunded_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_pi ON public.payments(payment_intent_id);

-- Stripe events (for webhook idempotency)
CREATE TABLE public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Affiliate settings
CREATE TABLE public.affiliate_settings (
  singleton boolean PRIMARY KEY DEFAULT true,
  base_rate numeric(5,4) NOT NULL DEFAULT 0.2500,
  paid_member_rate numeric(5,4) NOT NULL DEFAULT 0.3000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.user_profiles(id)
);

INSERT INTO public.affiliate_settings(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

-- Affiliate referrals
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  referred_email text,
  status text NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','paid','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aff_referrals_referrer ON public.affiliate_referrals(referrer_user_id);

-- Affiliate commissions
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  rate numeric(5,4) NOT NULL DEFAULT 0.2500,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TRIGGER trg_affiliate_commissions_updated_at
BEFORE UPDATE ON public.affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_aff_comm_referral ON public.affiliate_commissions(referral_id);

-- Forum threads
CREATE TABLE public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_forum_threads_updated_at
BEFORE UPDATE ON public.forum_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_forum_threads_created_at ON public.forum_threads(created_at DESC);

-- Forum comments
CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_forum_comments_updated_at
BEFORE UPDATE ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_forum_comments_thread ON public.forum_comments(thread_id, created_at);

-- Live feed signals
CREATE TABLE public.live_feed_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.user_profiles(id),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_feed_created_at ON public.live_feed_signals(created_at DESC);

-- Certificates
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  certificate_number text UNIQUE,
  full_name text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  pdf_url text,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','revoked','reissued')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.user_profiles(id),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'paid' CHECK (audience IN ('all','paid','affiliate')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- App settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.user_profiles(id)
);

-- Trading journal entries
CREATE TABLE public.trading_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy','sell')),
  quantity numeric,
  entry_price numeric,
  exit_price numeric,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trading_journal_user ON public.trading_journal_entries(user_id, opened_at DESC);

-- Leads journal entries
CREATE TABLE public.leads_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  lead_type text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_journal_user ON public.leads_journal_entries(user_id, created_at DESC);

-- =============================================
-- PART 5: CREATE HELPER FUNCTIONS (after tables exist)
-- =============================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT up.is_admin
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
  ), false);
$$;

-- Check if user can access course
CREATE OR REPLACE FUNCTION public.can_access_course()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.user_onboarding uo ON uo.user_id = up.id
    WHERE up.id = auth.uid()
      AND up.has_paid = true
      AND uo.welcome_completed = true
  );
$$;

-- Protect user profile fields from unauthorized changes
CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = old.id AND public.is_admin() = false THEN
    IF new.has_paid IS DISTINCT FROM old.has_paid
      OR new.paid_at IS DISTINCT FROM old.paid_at
      OR new.access_revoked_at IS DISTINCT FROM old.access_revoked_at
      OR new.stripe_customer_id IS DISTINCT FROM old.stripe_customer_id
      OR new.last_payment_intent_id IS DISTINCT FROM old.last_payment_intent_id
      OR new.is_admin IS DISTINCT FROM old.is_admin
      OR new.affiliate_role IS DISTINCT FROM old.affiliate_role
      OR new.affiliate_code IS DISTINCT FROM old.affiliate_code
      OR new.referred_by_user_id IS DISTINCT FROM old.referred_by_user_id
    THEN
      RAISE EXCEPTION 'You are not allowed to modify protected profile fields.';
    END IF;
  END IF;

  IF old.full_name_locked = true AND new.full_name IS DISTINCT FROM old.full_name THEN
    RAISE EXCEPTION 'Full name is locked and cannot be changed.';
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER trg_protect_user_profiles
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_user_profile_fields();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_onboarding (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Complete welcome function (for onboarding)
CREATE OR REPLACE FUNCTION public.complete_welcome(
  p_full_name text,
  p_agree1 boolean,
  p_agree2 boolean,
  p_agree3 boolean,
  p_agree4 boolean,
  p_agree5 boolean,
  p_terms_version text DEFAULT NULL,
  p_privacy_version text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF NOT (p_agree1 AND p_agree2 AND p_agree3 AND p_agree4 AND p_agree5) THEN
    RAISE EXCEPTION 'All agreements must be accepted';
  END IF;

  UPDATE public.user_profiles
     SET full_name = COALESCE(full_name, trim(p_full_name)),
         full_name_locked = true
   WHERE id = uid;

  UPDATE public.user_onboarding
     SET agree1 = true,
         agree2 = true,
         agree3 = true,
         agree4 = true,
         agree5 = true,
         welcome_completed = true,
         welcome_completed_at = now(),
         terms_version = p_terms_version,
         privacy_version = p_privacy_version
   WHERE user_id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_welcome(text,boolean,boolean,boolean,boolean,boolean,text,text) TO authenticated;

-- =============================================
-- PART 6: CREATE COMPATIBILITY VIEWS
-- =============================================

DROP VIEW IF EXISTS public.users CASCADE;
CREATE VIEW public.users AS
SELECT
  up.id,
  up.email,
  up.full_name,
  up.has_paid,
  uo.welcome_completed AS agreed_to_terms,
  uo.welcome_completed_at AS terms_agreed_at,
  uo.welcome_completed_at AS challenge_start_date,
  true AS cookies_consent,
  uo.welcome_completed_at AS cookies_consent_date,
  NULL::text AS stripe_session_id,
  up.created_at
FROM public.user_profiles up
JOIN public.user_onboarding uo ON uo.user_id = up.id;

DROP VIEW IF EXISTS public.user_progress CASCADE;
CREATE VIEW public.user_progress AS
SELECT
  cp.user_id,
  cp.day AS day_number,
  cp.completed_at,
  cp.quiz_passed
FROM public.challenge_progress cp;

-- =============================================
-- PART 7: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_feed_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_journal_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 8: CREATE SECURITY POLICIES
-- =============================================

-- User Profiles policies
CREATE POLICY "Profiles: read own" ON public.user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Profiles: update own" ON public.user_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles: admin read all" ON public.user_profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Profiles: admin update all" ON public.user_profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User Onboarding policies
CREATE POLICY "Onboarding: read own" ON public.user_onboarding FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Onboarding: update own" ON public.user_onboarding FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Course Content policies
CREATE POLICY "Course: read if access or admin" ON public.course_content FOR SELECT USING (public.can_access_course() OR public.is_admin());
CREATE POLICY "Course: admin insert" ON public.course_content FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Course: admin update" ON public.course_content FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Course: admin delete" ON public.course_content FOR DELETE USING (public.is_admin());

-- Challenge Progress policies
CREATE POLICY "Progress: read own" ON public.challenge_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Progress: insert own" ON public.challenge_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Progress: update own" ON public.challenge_progress FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Task Submissions policies
CREATE POLICY "Tasks: read own" ON public.task_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Tasks: insert own" ON public.task_submissions FOR INSERT WITH CHECK (user_id = auth.uid() AND public.can_access_course());
CREATE POLICY "Tasks: update own" ON public.task_submissions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Tasks: admin read all" ON public.task_submissions FOR SELECT USING (public.is_admin());
CREATE POLICY "Tasks: admin update all" ON public.task_submissions FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Quiz Questions policies
CREATE POLICY "Quiz Q: read if access or admin" ON public.quiz_questions FOR SELECT USING (public.can_access_course() OR public.is_admin());
CREATE POLICY "Quiz Q: admin insert" ON public.quiz_questions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Quiz Q: admin update" ON public.quiz_questions FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Quiz Q: admin delete" ON public.quiz_questions FOR DELETE USING (public.is_admin());

-- Quiz Attempts policies
CREATE POLICY "Quiz attempts: read own" ON public.quiz_attempts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Quiz attempts: insert own" ON public.quiz_attempts FOR INSERT WITH CHECK (user_id = auth.uid() AND public.can_access_course());
CREATE POLICY "Quiz attempts: update own" ON public.quiz_attempts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Quiz attempts: admin read all" ON public.quiz_attempts FOR SELECT USING (public.is_admin());

-- Payments policies
CREATE POLICY "Payments: read own" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Payments: admin read all" ON public.payments FOR SELECT USING (public.is_admin());
CREATE POLICY "Payments: admin insert" ON public.payments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Payments: admin update" ON public.payments FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Stripe Events policies
CREATE POLICY "Stripe events: admin read" ON public.stripe_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Stripe events: admin insert" ON public.stripe_events FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Stripe events: admin update" ON public.stripe_events FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Affiliate Settings policies
CREATE POLICY "Affiliate settings: admin read" ON public.affiliate_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "Affiliate settings: admin update" ON public.affiliate_settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Affiliate Referrals policies
CREATE POLICY "Affiliate referrals: referrer read" ON public.affiliate_referrals FOR SELECT USING (referrer_user_id = auth.uid());
CREATE POLICY "Affiliate referrals: admin read" ON public.affiliate_referrals FOR SELECT USING (public.is_admin());

-- Affiliate Commissions policies
CREATE POLICY "Affiliate commissions: referrer read" ON public.affiliate_commissions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.affiliate_referrals ar WHERE ar.id = affiliate_commissions.referral_id AND ar.referrer_user_id = auth.uid()));
CREATE POLICY "Affiliate commissions: admin read" ON public.affiliate_commissions FOR SELECT USING (public.is_admin());
CREATE POLICY "Affiliate commissions: admin insert" ON public.affiliate_commissions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Affiliate commissions: admin update" ON public.affiliate_commissions FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Forum Threads policies
CREATE POLICY "Forum threads: read if access or admin" ON public.forum_threads FOR SELECT USING (public.can_access_course() OR public.is_admin());
CREATE POLICY "Forum threads: insert if access" ON public.forum_threads FOR INSERT WITH CHECK (author_id = auth.uid() AND public.can_access_course());
CREATE POLICY "Forum threads: update own" ON public.forum_threads FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Forum threads: admin update" ON public.forum_threads FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Forum Comments policies
CREATE POLICY "Forum comments: read if access or admin" ON public.forum_comments FOR SELECT USING (public.can_access_course() OR public.is_admin());
CREATE POLICY "Forum comments: insert if access" ON public.forum_comments FOR INSERT WITH CHECK (author_id = auth.uid() AND public.can_access_course());
CREATE POLICY "Forum comments: update own" ON public.forum_comments FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Forum comments: admin update" ON public.forum_comments FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Live Feed policies
CREATE POLICY "Live feed: read if access or admin" ON public.live_feed_signals FOR SELECT USING (public.can_access_course() OR public.is_admin());
CREATE POLICY "Live feed: admin insert" ON public.live_feed_signals FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Live feed: admin update" ON public.live_feed_signals FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Certificates policies
CREATE POLICY "Certificates: read own" ON public.certificates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Certificates: admin insert" ON public.certificates FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Certificates: admin update" ON public.certificates FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Announcements policies
CREATE POLICY "Announcements: read" ON public.announcements FOR SELECT USING (audience = 'all' OR public.can_access_course() OR public.is_admin());
CREATE POLICY "Announcements: admin insert" ON public.announcements FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Announcements: admin update" ON public.announcements FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- App Settings policies
CREATE POLICY "App settings: admin read" ON public.app_settings FOR SELECT USING (public.is_admin());
CREATE POLICY "App settings: admin insert" ON public.app_settings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "App settings: admin update" ON public.app_settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trading Journal policies
CREATE POLICY "Trading journal: read own" ON public.trading_journal_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Trading journal: insert own" ON public.trading_journal_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Trading journal: update own" ON public.trading_journal_entries FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Leads Journal policies
CREATE POLICY "Leads journal: read own" ON public.leads_journal_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Leads journal: insert own" ON public.leads_journal_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Leads journal: update own" ON public.leads_journal_entries FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================
-- DONE! Your database is ready.
-- =============================================
