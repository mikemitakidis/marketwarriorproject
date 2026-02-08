
-- MarketWarrior: Clean install schema (Supabase/Postgres)
-- WARNING: This script DROPS existing MarketWarrior tables in public schema.
-- It does NOT touch auth.* tables.
-- Run in Supabase SQL Editor as postgres.

begin;

create extension if not exists pgcrypto;

-- Drop existing MarketWarrior tables
drop table if exists public.forum_comments cascade;
drop table if exists public.forum_threads cascade;
drop table if exists public.live_feed_signals cascade;
drop table if exists public.announcements cascade;

drop table if exists public.affiliate_commissions cascade;
drop table if exists public.affiliate_referrals cascade;
drop table if exists public.affiliate_settings cascade;

drop table if exists public.certificates cascade;

drop table if exists public.quiz_attempts cascade;
drop table if exists public.quiz_questions cascade;

drop table if exists public.task_submissions cascade;
drop table if exists public.challenge_progress cascade;

drop table if exists public.course_content cascade;

drop table if exists public.payments cascade;
drop table if exists public.stripe_events cascade;

drop table if exists public.trading_journal_entries cascade;
drop table if exists public.leads_journal_entries cascade;

drop table if exists public.user_onboarding cascade;
drop table if exists public.user_profiles cascade;

drop table if exists public.app_settings cascade;

-- Utility trigger for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Admin / access helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select up.is_admin
    from public.user_profiles up
    where up.id = auth.uid()
  ), false);
$$;

create or replace function public.can_access_course()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.user_onboarding uo on uo.user_id = up.id
    where up.id = auth.uid()
      and up.has_paid = true
      and uo.welcome_completed = true
  );
$$;

-- Core: user profiles
create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  full_name_locked boolean not null default false,

  has_paid boolean not null default false,
  paid_at timestamptz,
  access_revoked_at timestamptz,

  stripe_customer_id text,
  last_payment_intent_id text,

  is_admin boolean not null default false,

  affiliate_role text not null default 'none'
    check (affiliate_role in ('none','affiliate_only','paid_member')),
  affiliate_code text unique,
  referred_by_code text,
  referred_by_user_id uuid references public.user_profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- Welcome / onboarding (5 checkbox enforcement lives here)
create table public.user_onboarding (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,

  agree1 boolean not null default false,
  agree2 boolean not null default false,
  agree3 boolean not null default false,
  agree4 boolean not null default false,
  agree5 boolean not null default false,

  welcome_completed boolean not null default false,
  welcome_completed_at timestamptz,

  terms_version text,
  privacy_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_onboarding_updated_at
before update on public.user_onboarding
for each row execute function public.set_updated_at();

-- Prevent users from modifying protected fields + lock certificate name
create or replace function public.protect_user_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If the row-owner updates their profile, block sensitive fields.
  if auth.uid() is not null and auth.uid() = old.id and public.is_admin() = false then
    if new.has_paid is distinct from old.has_paid
      or new.paid_at is distinct from old.paid_at
      or new.access_revoked_at is distinct from old.access_revoked_at
      or new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.last_payment_intent_id is distinct from old.last_payment_intent_id
      or new.is_admin is distinct from old.is_admin
      or new.affiliate_role is distinct from old.affiliate_role
      or new.affiliate_code is distinct from old.affiliate_code
      or new.referred_by_user_id is distinct from old.referred_by_user_id
    then
      raise exception 'You are not allowed to modify protected profile fields.';
    end if;
  end if;

  -- Certificate name lock: once locked, cannot change full_name
  if old.full_name_locked = true and new.full_name is distinct from old.full_name then
    raise exception 'Full name is locked and cannot be changed.';
  end if;

  return new;
end;
$$;

create trigger trg_protect_user_profiles
before update on public.user_profiles
for each row execute function public.protect_user_profile_fields();

-- Auto-create profile + onboarding row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_onboarding (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Course content (Day 1-30 etc.)
create table public.course_content (
  day int primary key,
  title text,
  html_content text,
  video_url text,
  task_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_course_content_updated_at
before update on public.course_content
for each row execute function public.set_updated_at();

-- Challenge progress per user/day
create table public.challenge_progress (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  day int not null references public.course_content(day) on delete cascade,

  unlocked boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,

  quiz_passed boolean not null default false,
  task_submitted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, day)
);

create trigger trg_challenge_progress_updated_at
before update on public.challenge_progress
for each row execute function public.set_updated_at();

-- Task submissions
create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  day int not null references public.course_content(day) on delete cascade,

  submission_text text,
  attachment_url text,

  status text not null default 'submitted'
    check (status in ('submitted','reviewed','approved','rejected')),
  feedback text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_task_submissions_updated_at
before update on public.task_submissions
for each row execute function public.set_updated_at();

create index if not exists idx_task_submissions_user_day on public.task_submissions(user_id, day);

-- Quiz questions
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  day int not null references public.course_content(day) on delete cascade,
  order_index int not null default 1,

  question_text text not null,
  options jsonb not null,         -- {"A":"..","B":"..","C":"..","D":".."}
  correct_option text not null,   -- "A" | "B" | ...
  explanation text,
  points int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quiz_questions_updated_at
before update on public.quiz_questions
for each row execute function public.set_updated_at();

create index if not exists idx_quiz_questions_day on public.quiz_questions(day);

-- Quiz attempts
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  day int not null references public.course_content(day) on delete cascade,

  answers jsonb not null default '{}'::jsonb,
  score int not null default 0,
  max_score int not null default 0,
  passed boolean not null default false,

  started_at timestamptz not null default now(),
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quiz_attempts_updated_at
before update on public.quiz_attempts
for each row execute function public.set_updated_at();

create index if not exists idx_quiz_attempts_user_day on public.quiz_attempts(user_id, day);

-- Payments (Stripe-backed)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  stripe_session_id text,
  payment_intent_id text,
  amount_cents int,
  currency text default 'usd',
  status text not null default 'pending'
    check (status in ('pending','succeeded','refunded','failed')),

  paid_at timestamptz,
  refunded_at timestamptz,

  raw jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_pi on public.payments(payment_intent_id);

-- Stripe events (idempotency)
create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- =====================================================================
-- OLD CUSTOM AFFILIATE SYSTEM — NOT ACTIVELY USED
-- We now use PromoteKit (3rd party) for all affiliate tracking.
-- These tables (affiliate_settings, affiliate_referrals, affiliate_commissions)
-- and related user_profiles columns (affiliate_role, affiliate_code, referred_by_*)
-- are kept for reference but are not used by any active code.
-- =====================================================================

-- Affiliate settings (singleton row)
create table public.affiliate_settings (
  singleton boolean primary key default true,
  base_rate numeric(5,4) not null default 0.2500,
  paid_member_rate numeric(5,4) not null default 0.3000,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id)
);

insert into public.affiliate_settings(singleton) values (true)
on conflict (singleton) do nothing;

-- Affiliate referrals
create table public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.user_profiles(id) on delete cascade,
  referred_user_id uuid references public.user_profiles(id) on delete set null,
  referred_email text,

  status text not null default 'signed_up'
    check (status in ('signed_up','paid','refunded')),

  created_at timestamptz not null default now(),
  last_event_at timestamptz not null default now()
);

create index if not exists idx_aff_referrals_referrer on public.affiliate_referrals(referrer_user_id);

-- Affiliate commissions
create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.affiliate_referrals(id) on delete cascade,

  amount_cents int not null default 0,
  currency text not null default 'usd',
  rate numeric(5,4) not null default 0.2500,

  status text not null default 'pending'
    check (status in ('pending','approved','paid','void')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create trigger trg_affiliate_commissions_updated_at
before update on public.affiliate_commissions
for each row execute function public.set_updated_at();

create index if not exists idx_aff_comm_referral on public.affiliate_commissions(referral_id);

-- Community forum
create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  body text not null,

  is_pinned boolean not null default false,
  is_locked boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_forum_threads_updated_at
before update on public.forum_threads
for each row execute function public.set_updated_at();

create index if not exists idx_forum_threads_created_at on public.forum_threads(created_at desc);

create table public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.user_profiles(id) on delete cascade,
  body text not null,

  is_deleted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_forum_comments_updated_at
before update on public.forum_comments
for each row execute function public.set_updated_at();

create index if not exists idx_forum_comments_thread on public.forum_comments(thread_id, created_at);

-- Live feed
create table public.live_feed_signals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id),
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_feed_created_at on public.live_feed_signals(created_at desc);

-- Certificates (uses locked name)
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete cascade,
  certificate_number text unique,
  full_name text not null,
  issued_at timestamptz not null default now(),
  pdf_url text,
  status text not null default 'issued'
    check (status in ('issued','revoked','reissued')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_certificates_updated_at
before update on public.certificates
for each row execute function public.set_updated_at();

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.user_profiles(id),
  title text not null,
  body text not null,
  audience text not null default 'paid'
    check (audience in ('all','paid','affiliate')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- App settings
create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id)
);

-- Trading journal (optional)
create table public.trading_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy','sell')),
  quantity numeric,
  entry_price numeric,
  exit_price numeric,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_trading_journal_user on public.trading_journal_entries(user_id, opened_at desc);

-- Leads journal (optional)
create table public.leads_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  lead_type text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_journal_user on public.leads_journal_entries(user_id, created_at desc);

-- RPC: complete welcome (enforces all 5 checkboxes + locks name)
create or replace function public.complete_welcome(
  p_full_name text,
  p_agree1 boolean,
  p_agree2 boolean,
  p_agree3 boolean,
  p_agree4 boolean,
  p_agree5 boolean,
  p_terms_version text default null,
  p_privacy_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'Full name is required';
  end if;

  if not (p_agree1 and p_agree2 and p_agree3 and p_agree4 and p_agree5) then
    raise exception 'All agreements must be accepted';
  end if;

  update public.user_profiles
     set full_name = coalesce(full_name, trim(p_full_name)),
         full_name_locked = true
   where id = uid;

  update public.user_onboarding
     set agree1 = true,
         agree2 = true,
         agree3 = true,
         agree4 = true,
         agree5 = true,
         welcome_completed = true,
         welcome_completed_at = now(),
         terms_version = p_terms_version,
         privacy_version = p_privacy_version
   where user_id = uid;
end;
$$;

grant execute on function public.complete_welcome(text,boolean,boolean,boolean,boolean,boolean,text,text) to authenticated;

-- ---------------------------------------------------------------------
-- Compatibility views (for older templates/specs)
-- ---------------------------------------------------------------------
drop view if exists public.users cascade;
create view public.users as
select
  up.id,
  up.email,
  up.full_name,
  up.has_paid,
  uo.welcome_completed as agreed_to_terms,
  uo.welcome_completed_at as terms_agreed_at,
  uo.welcome_completed_at as challenge_start_date,
  true as cookies_consent,
  uo.welcome_completed_at as cookies_consent_date,
  null::text as stripe_session_id,
  up.created_at
from public.user_profiles up
join public.user_onboarding uo on uo.user_id = up.id;

drop view if exists public.user_progress cascade;
create view public.user_progress as
select
  cp.user_id,
  cp.day as day_number,
  cp.completed_at,
  cp.quiz_passed
from public.challenge_progress cp;

-- RLS
alter table public.user_profiles enable row level security;
alter table public.user_onboarding enable row level security;
alter table public.course_content enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.task_submissions enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_events enable row level security;
alter table public.affiliate_settings enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_comments enable row level security;
alter table public.live_feed_signals enable row level security;
alter table public.certificates enable row level security;
alter table public.announcements enable row level security;
alter table public.app_settings enable row level security;
alter table public.trading_journal_entries enable row level security;
alter table public.leads_journal_entries enable row level security;

-- Policies
create policy "Profiles: read own"
on public.user_profiles for select
using (id = auth.uid());

create policy "Profiles: update own (restricted by trigger)"
on public.user_profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Profiles: admin read all"
on public.user_profiles for select
using (public.is_admin());

create policy "Profiles: admin update all"
on public.user_profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "Onboarding: read own"
on public.user_onboarding for select
using (user_id = auth.uid());

create policy "Onboarding: update own"
on public.user_onboarding for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Course: read if access or admin"
on public.course_content for select
using (public.can_access_course() or public.is_admin());

create policy "Course: admin insert"
on public.course_content for insert
with check (public.is_admin());

create policy "Course: admin update"
on public.course_content for update
using (public.is_admin())
with check (public.is_admin());

create policy "Course: admin delete"
on public.course_content for delete
using (public.is_admin());

create policy "Progress: read own"
on public.challenge_progress for select
using (user_id = auth.uid());

create policy "Progress: insert own"
on public.challenge_progress for insert
with check (user_id = auth.uid());

create policy "Progress: update own"
on public.challenge_progress for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Tasks: read own"
on public.task_submissions for select
using (user_id = auth.uid());

create policy "Tasks: insert own (access required)"
on public.task_submissions for insert
with check (user_id = auth.uid() and public.can_access_course());

create policy "Tasks: update own"
on public.task_submissions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Tasks: admin read all"
on public.task_submissions for select
using (public.is_admin());

create policy "Tasks: admin update all"
on public.task_submissions for update
using (public.is_admin())
with check (public.is_admin());

create policy "Quiz Q: read if access or admin"
on public.quiz_questions for select
using (public.can_access_course() or public.is_admin());

create policy "Quiz Q: admin insert"
on public.quiz_questions for insert
with check (public.is_admin());

create policy "Quiz Q: admin update"
on public.quiz_questions for update
using (public.is_admin())
with check (public.is_admin());

create policy "Quiz Q: admin delete"
on public.quiz_questions for delete
using (public.is_admin());

create policy "Quiz attempts: read own"
on public.quiz_attempts for select
using (user_id = auth.uid());

create policy "Quiz attempts: insert own (access required)"
on public.quiz_attempts for insert
with check (user_id = auth.uid() and public.can_access_course());

create policy "Quiz attempts: update own"
on public.quiz_attempts for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Quiz attempts: admin read all"
on public.quiz_attempts for select
using (public.is_admin());

create policy "Payments: read own"
on public.payments for select
using (user_id = auth.uid());

create policy "Payments: admin read all"
on public.payments for select
using (public.is_admin());

create policy "Payments: admin insert"
on public.payments for insert
with check (public.is_admin());

create policy "Payments: admin update"
on public.payments for update
using (public.is_admin())
with check (public.is_admin());

create policy "Stripe events: admin read"
on public.stripe_events for select
using (public.is_admin());

create policy "Stripe events: admin insert"
on public.stripe_events for insert
with check (public.is_admin());

create policy "Stripe events: admin update"
on public.stripe_events for update
using (public.is_admin())
with check (public.is_admin());

create policy "Affiliate settings: admin read"
on public.affiliate_settings for select
using (public.is_admin());

create policy "Affiliate settings: admin update"
on public.affiliate_settings for update
using (public.is_admin())
with check (public.is_admin());

create policy "Affiliate referrals: referrer read"
on public.affiliate_referrals for select
using (referrer_user_id = auth.uid());

create policy "Affiliate referrals: admin read"
on public.affiliate_referrals for select
using (public.is_admin());

create policy "Affiliate commissions: referrer read"
on public.affiliate_commissions for select
using (
  exists (
    select 1
    from public.affiliate_referrals ar
    where ar.id = affiliate_commissions.referral_id
      and ar.referrer_user_id = auth.uid()
  )
);

create policy "Affiliate commissions: admin read"
on public.affiliate_commissions for select
using (public.is_admin());

create policy "Affiliate commissions: admin insert"
on public.affiliate_commissions for insert
with check (public.is_admin());

create policy "Affiliate commissions: admin update"
on public.affiliate_commissions for update
using (public.is_admin())
with check (public.is_admin());

create policy "Forum threads: read if access or admin"
on public.forum_threads for select
using (public.can_access_course() or public.is_admin());

create policy "Forum threads: insert if access"
on public.forum_threads for insert
with check (author_id = auth.uid() and public.can_access_course());

create policy "Forum threads: update own"
on public.forum_threads for update
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "Forum threads: admin update"
on public.forum_threads for update
using (public.is_admin())
with check (public.is_admin());

create policy "Forum comments: read if access or admin"
on public.forum_comments for select
using (public.can_access_course() or public.is_admin());

create policy "Forum comments: insert if access"
on public.forum_comments for insert
with check (author_id = auth.uid() and public.can_access_course());

create policy "Forum comments: update own"
on public.forum_comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "Forum comments: admin update"
on public.forum_comments for update
using (public.is_admin())
with check (public.is_admin());

create policy "Live feed: read if access or admin"
on public.live_feed_signals for select
using (public.can_access_course() or public.is_admin());

create policy "Live feed: admin insert"
on public.live_feed_signals for insert
with check (public.is_admin());

create policy "Live feed: admin update"
on public.live_feed_signals for update
using (public.is_admin())
with check (public.is_admin());

create policy "Certificates: read own"
on public.certificates for select
using (user_id = auth.uid());

create policy "Certificates: admin insert"
on public.certificates for insert
with check (public.is_admin());

create policy "Certificates: admin update"
on public.certificates for update
using (public.is_admin())
with check (public.is_admin());

create policy "Announcements: read"
on public.announcements for select
using (audience = 'all' or public.can_access_course() or public.is_admin());

create policy "Announcements: admin insert"
on public.announcements for insert
with check (public.is_admin());

create policy "Announcements: admin update"
on public.announcements for update
using (public.is_admin())
with check (public.is_admin());

create policy "App settings: admin read"
on public.app_settings for select
using (public.is_admin());

create policy "App settings: admin insert"
on public.app_settings for insert
with check (public.is_admin());

create policy "App settings: admin update"
on public.app_settings for update
using (public.is_admin())
with check (public.is_admin());

create policy "Trading journal: read own"
on public.trading_journal_entries for select
using (user_id = auth.uid());

create policy "Trading journal: insert own"
on public.trading_journal_entries for insert
with check (user_id = auth.uid());

create policy "Trading journal: update own"
on public.trading_journal_entries for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Leads journal: read own"
on public.leads_journal_entries for select
using (user_id = auth.uid());

create policy "Leads journal: insert own"
on public.leads_journal_entries for insert
with check (user_id = auth.uid());

create policy "Leads journal: update own"
on public.leads_journal_entries for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
