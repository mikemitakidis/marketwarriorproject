-- Migration: Fix Journal Schema - Add journal_user_id to ALL journal tables
-- This migration fixes the data model mismatch where journal tables referenced user_profiles
-- instead of the standalone journal_users table.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- The Trading Journal should be completely separate from course users.

begin;

-- ============================================================================
-- 1. ADD journal_user_id TO ALL JOURNAL TABLES THAT ARE MISSING IT
-- ============================================================================

-- journal_tags: Add journal_user_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_tags'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_tags
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- journal_goals: Add journal_user_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_goals'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_goals
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- journal_challenge_rules: Add journal_user_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_challenge_rules'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_challenge_rules
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- journal_rule_violations: Add journal_user_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_rule_violations'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_rule_violations
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- journal_daily_reports: Add journal_user_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_daily_reports'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_daily_reports
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- journal_playbook: Add journal_user_id
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_playbook'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_playbook
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- ============================================================================
-- 2. CREATE INDEXES FOR journal_user_id COLUMNS
-- ============================================================================

-- journal_settings index
create index if not exists idx_journal_settings_journal_user_id
on public.journal_settings(journal_user_id);

-- journal_trades index
create index if not exists idx_journal_trades_journal_user_id
on public.journal_trades(journal_user_id);

-- journal_tags index
create index if not exists idx_journal_tags_journal_user_id
on public.journal_tags(journal_user_id);

-- journal_goals index (if table exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'journal_goals') then
    execute 'create index if not exists idx_journal_goals_journal_user_id on public.journal_goals(journal_user_id)';
  end if;
end $$;

-- journal_challenge_rules index
create index if not exists idx_journal_challenge_rules_journal_user_id
on public.journal_challenge_rules(journal_user_id);

-- journal_rule_violations index
create index if not exists idx_journal_rule_violations_journal_user_id
on public.journal_rule_violations(journal_user_id);

-- journal_daily_reports index
create index if not exists idx_journal_daily_reports_journal_user_id
on public.journal_daily_reports(journal_user_id);

-- journal_playbook index
create index if not exists idx_journal_playbook_journal_user_id
on public.journal_playbook(journal_user_id);

-- ============================================================================
-- 3. CREATE JOURNAL PAYMENTS TABLE (separate from course payments)
-- ============================================================================

-- This table tracks payments specifically for the Trading Journal product
create table if not exists public.journal_payments (
  id uuid primary key default gen_random_uuid(),
  journal_user_id uuid not null references public.journal_users(id) on delete cascade,

  -- Stripe info
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,

  -- Payment details
  amount_cents int not null,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'refunded')),

  -- Product info
  product_type text not null default 'subscription'
    check (product_type in ('subscription', 'lifetime', 'one_time')),

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_journal_payments_user
on public.journal_payments(journal_user_id);

create index if not exists idx_journal_payments_session
on public.journal_payments(stripe_checkout_session_id);

-- Enable RLS
alter table public.journal_payments enable row level security;

-- ============================================================================
-- 4. ADD UNIQUE CONSTRAINT FOR journal_settings.journal_user_id
-- ============================================================================

-- Allow upsert operations on journal_settings by journal_user_id
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'journal_settings_journal_user_id_key'
  ) then
    alter table public.journal_settings
    add constraint journal_settings_journal_user_id_key unique (journal_user_id);
  end if;
exception when others then
  -- Constraint might already exist with different name
  null;
end $$;

-- ============================================================================
-- 5. ADD UNIQUE CONSTRAINT FOR journal_daily_reports
-- ============================================================================

-- Need unique on (journal_user_id, report_date) for upsert
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'journal_daily_reports_journal_user_date_key'
  ) then
    alter table public.journal_daily_reports
    add constraint journal_daily_reports_journal_user_date_key
    unique (journal_user_id, report_date);
  end if;
exception when others then
  null;
end $$;

-- ============================================================================
-- 6. ADD AI REQUEST TRACKING FIELDS TO journal_users
-- ============================================================================

-- These fields track daily AI coach usage for rate limiting
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_users'
    and column_name = 'ai_requests_today'
  ) then
    alter table public.journal_users
    add column ai_requests_today int not null default 0;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_users'
    and column_name = 'ai_requests_date'
  ) then
    alter table public.journal_users
    add column ai_requests_date date;
  end if;
end $$;

commit;

-- ============================================================================
-- NOTE: RLS POLICIES
-- ============================================================================
-- The existing RLS policies use `user_id = auth.uid()` which checks against
-- user_profiles (course users). For the Trading Journal to be truly separate,
-- you have two options:
--
-- Option 1: Use service role in API (current approach)
--   - All journal APIs use service role Supabase client
--   - Authentication is handled at the application level via journalAuth.js
--   - RLS is effectively bypassed for journal operations
--
-- Option 2: Create new RLS policies for journal_user_id
--   - Would require storing journal_users.auth_id in a way RLS can check
--   - More complex but provides database-level security
--
-- Current implementation uses Option 1 (service role), which is secure
-- because authentication is enforced in the API layer.
