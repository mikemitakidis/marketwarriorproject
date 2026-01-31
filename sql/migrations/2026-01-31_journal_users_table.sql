-- Migration: Create journal_users table for standalone Trading Journal
-- This table tracks journal-specific users, completely separate from course users
-- Run in Supabase SQL Editor

begin;

-- ============================================================================
-- 1. CREATE JOURNAL_USERS TABLE
-- ============================================================================

-- This table stores journal-specific user data
-- It references auth.users directly (not user_profiles) for independence
create table if not exists public.journal_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique,  -- References Supabase auth.users.id

  -- Basic info
  email text not null,
  full_name text,

  -- Journal-specific payment (separate from course)
  has_paid boolean not null default false,
  paid_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Access control
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for fast lookup by auth_id
create index if not exists idx_journal_users_auth_id on public.journal_users(auth_id);
create index if not exists idx_journal_users_email on public.journal_users(email);

-- Trigger for updated_at
create trigger trg_journal_users_updated_at
before update on public.journal_users
for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.journal_users enable row level security;

-- Users can only read their own data
create policy "Journal users: read own"
on public.journal_users for select
using (auth_id = auth.uid());

-- Users can update their own data
create policy "Journal users: update own"
on public.journal_users for update
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

-- Inserts are done via service role (server-side)
-- No policy for insert - handled by server

-- ============================================================================
-- 3. ADD JOURNAL SETTINGS TO APP_SETTINGS
-- ============================================================================

-- Insert default journal settings if they don't exist
insert into public.app_settings (key, value, description)
values
  ('journal_ai_chat_enabled', 'true', 'Enable/disable AI chat in Trading Journal'),
  ('journal_paid_enabled', 'false', 'Enable/disable paid mode for Trading Journal'),
  ('journal_payment_link', '', 'Stripe payment link for Trading Journal subscription')
on conflict (key) do nothing;

-- ============================================================================
-- 4. UPDATE JOURNAL TABLES TO SUPPORT JOURNAL_USERS
-- ============================================================================

-- Add journal_user_id column to journal_settings if not exists
-- This allows journal settings to be linked to journal_users instead of user_profiles
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

-- Add journal_user_id column to journal_trades if not exists
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

commit;
