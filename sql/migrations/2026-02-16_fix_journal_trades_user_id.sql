-- Migration: Make journal_trades.user_id nullable
--
-- The journal_trades table was originally created with:
--   user_id uuid NOT NULL references user_profiles(id)
--
-- After the Trading Journal became a standalone product with its own
-- journal_users table, the journal_user_id column was added.
-- But user_id was never made nullable, causing ALL inserts to fail
-- because the API correctly uses journal_user_id (not user_id).
--
-- This migration makes user_id nullable so inserts can succeed
-- using only journal_user_id.
--
-- IMPORTANT: Run this in Supabase SQL Editor

begin;

-- 1. Drop NOT NULL constraint on user_id
alter table public.journal_trades alter column user_id drop not null;

-- 2. Also make user_id nullable on other journal tables that have the same issue
-- (journal_settings, journal_tags, etc. all have user_id NOT NULL from original schema)

do $$
begin
  -- journal_settings: user_id is the PRIMARY KEY, can't drop NOT NULL
  -- It's a different pattern - skip it

  -- journal_tags: user_id is already nullable (null for system tags)
  -- No change needed

  -- journal_challenge_rules
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_challenge_rules'
    and column_name = 'user_id' and is_nullable = 'NO'
  ) then
    alter table public.journal_challenge_rules alter column user_id drop not null;
  end if;

  -- journal_rule_violations
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_rule_violations'
    and column_name = 'user_id' and is_nullable = 'NO'
  ) then
    alter table public.journal_rule_violations alter column user_id drop not null;
  end if;

  -- journal_daily_reports
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_daily_reports'
    and column_name = 'user_id' and is_nullable = 'NO'
  ) then
    alter table public.journal_daily_reports alter column user_id drop not null;
  end if;

  -- journal_playbook
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_playbook'
    and column_name = 'user_id' and is_nullable = 'NO'
  ) then
    alter table public.journal_playbook alter column user_id drop not null;
  end if;
end $$;

commit;
