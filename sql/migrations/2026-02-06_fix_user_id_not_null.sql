-- Migration: Make user_id nullable on journal tables
-- The original schema defined user_id as NOT NULL referencing user_profiles.
-- The journal now uses journal_user_id (referencing journal_users) for all operations.
-- The API inserts journal_user_id but NOT user_id, causing NOT NULL violations.
--
-- This migration makes user_id nullable so inserts with only journal_user_id succeed.
-- Run in Supabase SQL Editor.

begin;

-- Make user_id nullable on journal_trades
alter table public.journal_trades
  alter column user_id drop not null;

-- Make user_id nullable on journal_settings (if it has user_id as PK, skip - handled differently)
-- journal_settings has user_id as PK, so we can't just make it nullable.
-- Instead, ensure journal_user_id is the effective key (already handled by unique constraint).

-- Make user_id nullable on journal_tags (user_id can be null for system tags already)
-- No change needed - user_id on journal_tags already allows null (for system tags).

-- Make user_id nullable on journal_challenge_rules
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_challenge_rules'
    and column_name = 'user_id'
    and is_nullable = 'NO'
  ) then
    alter table public.journal_challenge_rules alter column user_id drop not null;
  end if;
end $$;

-- Make user_id nullable on journal_rule_violations
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_rule_violations'
    and column_name = 'user_id'
    and is_nullable = 'NO'
  ) then
    alter table public.journal_rule_violations alter column user_id drop not null;
  end if;
end $$;

-- Make user_id nullable on journal_daily_reports
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_daily_reports'
    and column_name = 'user_id'
    and is_nullable = 'NO'
  ) then
    alter table public.journal_daily_reports alter column user_id drop not null;
  end if;
end $$;

-- Make user_id nullable on journal_playbook
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'journal_playbook'
    and column_name = 'user_id'
    and is_nullable = 'NO'
  ) then
    alter table public.journal_playbook alter column user_id drop not null;
  end if;
end $$;

commit;
