-- Migration: Add admin management fields to journal_users
-- Run this in Supabase SQL Editor

begin;

-- Add is_suspended field
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_users' and column_name = 'is_suspended'
  ) then
    alter table public.journal_users add column is_suspended boolean not null default false;
  end if;
end $$;

-- Add custom AI daily limit (null = use default of 10)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_users' and column_name = 'ai_daily_limit'
  ) then
    alter table public.journal_users add column ai_daily_limit int default null;
  end if;
end $$;

-- Add admin notes field
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'journal_users' and column_name = 'admin_notes'
  ) then
    alter table public.journal_users add column admin_notes text default null;
  end if;
end $$;

commit;
