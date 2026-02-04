-- Migration: Fix Journal Schema - Add journal_user_id to ALL journal tables
-- This migration fixes the data model mismatch where journal tables referenced user_profiles
-- instead of the standalone journal_users table.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- The Trading Journal should be completely separate from course users.

begin;

-- ============================================================================
-- FIRST: Add journal_user_id to journal_settings and journal_trades
-- (These were supposed to be added in a previous migration but may be missing)
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_settings'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_settings
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_trades'
    and column_name = 'journal_user_id'
  ) then
    alter table public.journal_trades
    add column journal_user_id uuid references public.journal_users(id) on delete cascade;
  end if;
end $$;

-- ============================================================================
-- 1. ADD journal_user_id TO ALL OTHER JOURNAL TABLES
-- ============================================================================

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
-- 2. CREATE INDEXES
-- ============================================================================

create index if not exists idx_journal_settings_journal_user_id on public.journal_settings(journal_user_id);
create index if not exists idx_journal_trades_journal_user_id on public.journal_trades(journal_user_id);
create index if not exists idx_journal_tags_journal_user_id on public.journal_tags(journal_user_id);
create index if not exists idx_journal_challenge_rules_journal_user_id on public.journal_challenge_rules(journal_user_id);
create index if not exists idx_journal_rule_violations_journal_user_id on public.journal_rule_violations(journal_user_id);
create index if not exists idx_journal_daily_reports_journal_user_id on public.journal_daily_reports(journal_user_id);
create index if not exists idx_journal_playbook_journal_user_id on public.journal_playbook(journal_user_id);

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'journal_goals') then
    execute 'create index if not exists idx_journal_goals_journal_user_id on public.journal_goals(journal_user_id)';
  end if;
end $$;

-- ============================================================================
-- 3. CREATE JOURNAL PAYMENTS TABLE
-- ============================================================================

create table if not exists public.journal_payments (
  id uuid primary key default gen_random_uuid(),
  journal_user_id uuid not null references public.journal_users(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  amount_cents int not null,
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  product_type text not null default 'subscription' check (product_type in ('subscription', 'lifetime', 'one_time')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_journal_payments_user on public.journal_payments(journal_user_id);
create index if not exists idx_journal_payments_session on public.journal_payments(stripe_checkout_session_id);
alter table public.journal_payments enable row level security;

-- ============================================================================
-- 4. ADD UNIQUE CONSTRAINTS
-- ============================================================================

do $$
begin
  alter table public.journal_settings add constraint journal_settings_journal_user_id_key unique (journal_user_id);
exception when others then null;
end $$;

do $$
begin
  alter table public.journal_daily_reports add constraint journal_daily_reports_journal_user_date_key unique (journal_user_id, report_date);
exception when others then null;
end $$;

-- ============================================================================
-- 5. ADD AI REQUEST TRACKING TO journal_users
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_users' and column_name = 'ai_requests_today'
  ) then
    alter table public.journal_users add column ai_requests_today int not null default 0;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_users' and column_name = 'ai_requests_date'
  ) then
    alter table public.journal_users add column ai_requests_date date;
  end if;
end $$;

commit;

-- ============================================================================
-- NOTE: DATA BACKFILL (Run separately if you have existing data)
-- ============================================================================
-- If you have existing data tied to user_id (course users), you would need to
-- map it to journal_user_id. Since the journal is new and was free for marketing,
-- most users likely don't have data yet. If you do have data to migrate:
--
-- UPDATE journal_trades t
-- SET journal_user_id = ju.id
-- FROM journal_users ju
-- WHERE t.user_id = ju.auth_id AND t.journal_user_id IS NULL;
--
-- (Repeat for other tables as needed)

-- ============================================================================
-- NOTE: RLS POLICIES (Optional - for client-side access)
-- ============================================================================
-- Current implementation uses service role in API layer, so RLS is bypassed.
-- If you want database-level security for client-side access:
--
-- CREATE POLICY journal_trades_policy ON journal_trades
--   FOR ALL USING (
--     journal_user_id IN (
--       SELECT id FROM journal_users WHERE auth_id = auth.uid()
--     )
--   );
