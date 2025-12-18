-- MarketWarrior RESET (drops only MarketWarrior tables/functions/triggers in public schema)
-- Run this BEFORE marketwarrior_full_schema.sql if you want to wipe and recreate.

-- Drop tables (CASCADE removes dependent policies/FKs)
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;
DROP TABLE IF EXISTS public.quiz_results CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.task_submissions CASCADE;
DROP TABLE IF EXISTS public.challenge_progress CASCADE;
DROP TABLE IF EXISTS public.course_content CASCADE;
DROP TABLE IF EXISTS public.stripe_events CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.affiliate_profiles CASCADE;
DROP TABLE IF EXISTS public.affiliate_settings CASCADE;
DROP TABLE IF EXISTS public.leads_journal CASCADE;
DROP TABLE IF EXISTS public.trading_journal CASCADE;
DROP TABLE IF EXISTS public.user_onboarding CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- Drop functions/triggers (ignore if missing)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.lock_full_name() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_effective_affiliate_rate(uuid) CASCADE;

-- NOTE: We do not drop Supabase auth schema objects.
