-- ============================================================
-- MarketWarrior REQUIRED PATCH (safe to run on existing project)
--
-- Run this in Supabase SQL Editor.
--
-- What it does:
-- 1) Ensures public.user_profiles exists with the columns the app expects
-- 2) Creates trigger to auto-create a profile row on signup
-- 3) Enables RLS + policies (users can read/update their own profile)
-- 4) Adds certificate name lock (full_name_locked) + protected fields trigger
-- ============================================================

-- Needed for gen_random_uuid() if you later use it elsewhere
create extension if not exists pgcrypto;

-- 1) Base table (minimal) if you don't have it yet
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- 2) Required columns (idempotent)
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists full_name_locked boolean not null default false;
alter table public.user_profiles add column if not exists role text not null default 'user';
alter table public.user_profiles add column if not exists has_paid boolean not null default false;
alter table public.user_profiles add column if not exists paid_at timestamptz;
alter table public.user_profiles add column if not exists welcome_completed boolean not null default false;
alter table public.user_profiles add column if not exists welcome_completed_at timestamptz;
alter table public.user_profiles add column if not exists terms_accepted_at timestamptz;
alter table public.user_profiles add column if not exists welcome_payload jsonb;
alter table public.user_profiles add column if not exists referred_by_code text;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

-- 3) Maintain updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- 4) Protect sensitive columns and lock certificate name after Welcome
create or replace function public.protect_user_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- System-controlled columns (only server/service role should change these)
    if new.role is distinct from old.role then
      raise exception 'role is protected';
    end if;
    if new.has_paid is distinct from old.has_paid then
      raise exception 'has_paid is protected';
    end if;
    if new.paid_at is distinct from old.paid_at then
      raise exception 'paid_at is protected';
    end if;
    if new.referred_by_code is distinct from old.referred_by_code then
      raise exception 'referred_by_code is protected';
    end if;

    -- Certificate name lock: once locked, name (and the lock flag) cannot change.
    if old.full_name_locked and (new.full_name is distinct from old.full_name) then
      raise exception 'full_name is locked';
    end if;
    if old.full_name_locked and (new.full_name_locked is distinct from old.full_name_locked) then
      raise exception 'full_name_locked is locked';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_user_profiles on public.user_profiles;
create trigger trg_protect_user_profiles
before update on public.user_profiles
for each row execute function public.protect_user_profiles();

-- 5) Auto-create profile row on signup (mandatory for clean flow)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, full_name, referred_by_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null),
    nullif(new.raw_user_meta_data->>'referred_by_code', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 6) Backfill profiles for any existing auth users
insert into public.user_profiles (user_id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', null)
from auth.users u
where not exists (
  select 1 from public.user_profiles p where p.user_id = u.id
);

-- 7) RLS policies for user_profiles
alter table public.user_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own"
on public.user_profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
on public.user_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
