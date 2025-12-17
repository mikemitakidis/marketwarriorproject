-- ============================================================
-- MarketWarrior Clean Schema (public)
-- - user profiles auto-created on signup
-- - payment gating fields
-- - welcome completion fields
-- - affiliate system (admin adjustable rates)
-- - forum starter
-- ============================================================

-- NOTE: This script is designed for a "wipe and rebuild" of OUR custom objects.
-- It does NOT touch Supabase internal schemas (auth, storage, etc.).

-- ---------- Drop old objects (safe) ----------
drop table if exists public.forum_comments cascade;
drop table if exists public.forum_threads cascade;

drop table if exists public.affiliate_commissions cascade;
drop table if exists public.affiliate_profiles cascade;
drop table if exists public.affiliate_settings cascade;

drop table if exists public.stripe_events cascade;
drop table if exists public.user_profiles cascade;

drop function if exists public.is_admin(uuid) cascade;
drop function if exists public.generate_referral_code(uuid) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_paid_upgrade() cascade;

-- ---------- Core profiles ----------
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  -- Becomes TRUE after the Welcome page is submitted. When TRUE, the name
  -- must not be changed (certificate safety).
  full_name_locked boolean not null default false,
  role text not null default 'user' check (role in ('user','admin')),
  has_paid boolean not null default false,
  paid_at timestamptz,
  welcome_completed boolean not null default false,
  welcome_completed_at timestamptz,
  terms_accepted_at timestamptz,
  welcome_payload jsonb,
  referred_by_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.user_profiles (has_paid);
create index on public.user_profiles (welcome_completed);

-- Update updated_at automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- Protect sensitive columns from being changed by normal users.
-- (RLS is row-level; this trigger provides column-level enforcement.)
create or replace function public.protect_user_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- role / payment / referral are system-controlled
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

    -- Certificate name lock: once locked, name (and the lock) cannot change.
    if old.full_name_locked and (new.full_name is distinct from old.full_name) then
      raise exception 'full_name is locked';
    end if;
    if old.full_name_locked and (new.full_name_locked is distinct from old.full_name_locked) then
      raise exception 'full_name_locked is locked';
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_protect_user_profiles on public.user_profiles;
create trigger trg_protect_user_profiles
before update on public.user_profiles
for each row execute function public.protect_user_profiles();

-- ---------- Admin helper ----------
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.user_profiles p
    where p.user_id = uid and p.role = 'admin'
  );
$$;

-- ---------- Affiliate tables ----------
create table public.affiliate_settings (
  id int primary key default 1,
  paid_member_rate numeric(5,4) not null default 0.3000 check (paid_member_rate >= 0 and paid_member_rate <= 1),
  affiliate_only_rate numeric(5,4) not null default 0.2500 check (affiliate_only_rate >= 0 and affiliate_only_rate <= 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.affiliate_settings (id) values (1);

create or replace function public.generate_referral_code(uid uuid)
returns text language sql immutable as $$
  -- 8-char stable code
  select substr(md5(uid::text), 1, 8);
$$;

create table public.affiliate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('paid_member','affiliate_only')),
  active boolean not null default true,
  referral_code text unique not null default public.generate_referral_code(auth.uid()),
  created_at timestamptz not null default now()
);

create index on public.affiliate_profiles (referral_code);

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  commission_rate numeric(5,4) not null default 0,
  commission_cents int not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','paid','void')),
  created_at timestamptz not null default now()
);

create index on public.affiliate_commissions (affiliate_user_id);
create index on public.affiliate_commissions (referred_user_id);
create index on public.affiliate_commissions (status);

-- ---------- Stripe webhook idempotency ----------
create table public.stripe_events (
  id text primary key,
  created_at timestamptz not null default now()
);

-- ---------- Forum starter ----------
create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- Trigger: auto-create profile on signup ----------
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
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Trigger: if user becomes paid -> ensure affiliate profile exists as paid_member ----------
create or replace function public.handle_paid_upgrade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.has_paid is distinct from true) and (new.has_paid = true) then
    insert into public.affiliate_profiles (user_id, mode, active, referral_code)
    values (new.user_id, 'paid_member', true, public.generate_referral_code(new.user_id))
    on conflict (user_id) do update
      set mode = 'paid_member',
          active = true;
  end if;
  return new;
end; $$;

drop trigger if exists trg_handle_paid_upgrade on public.user_profiles;
create trigger trg_handle_paid_upgrade
after update of has_paid on public.user_profiles
for each row execute function public.handle_paid_upgrade();

-- ============================================================
-- RLS
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.affiliate_settings enable row level security;
alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_comments enable row level security;
alter table public.stripe_events enable row level security;

-- user_profiles: users can read/update their own
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

-- admins can read all profiles
drop policy if exists "profiles_select_admin" on public.user_profiles;
create policy "profiles_select_admin"
on public.user_profiles for select
to authenticated
using (public.is_admin(auth.uid()));

-- affiliate_settings: only admin read/update
drop policy if exists "affiliate_settings_admin_select" on public.affiliate_settings;
create policy "affiliate_settings_admin_select"
on public.affiliate_settings for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "affiliate_settings_admin_update" on public.affiliate_settings;
create policy "affiliate_settings_admin_update"
on public.affiliate_settings for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- affiliate_profiles: user can read/insert/update own; admin can read all
drop policy if exists "affiliate_profiles_select_own" on public.affiliate_profiles;
create policy "affiliate_profiles_select_own"
on public.affiliate_profiles for select
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "affiliate_profiles_upsert_own" on public.affiliate_profiles;
create policy "affiliate_profiles_upsert_own"
on public.affiliate_profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "affiliate_profiles_update_own" on public.affiliate_profiles;
create policy "affiliate_profiles_update_own"
on public.affiliate_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- affiliate_commissions: affiliate can read own commissions; admin can read all
drop policy if exists "affiliate_commissions_select" on public.affiliate_commissions;
create policy "affiliate_commissions_select"
on public.affiliate_commissions for select
to authenticated
using (affiliate_user_id = auth.uid() or public.is_admin(auth.uid()));

-- forum: any authenticated user can read; write own; edit/delete own or admin
drop policy if exists "forum_threads_select" on public.forum_threads;
create policy "forum_threads_select"
on public.forum_threads for select
to authenticated
using (true);

drop policy if exists "forum_threads_insert" on public.forum_threads;
create policy "forum_threads_insert"
on public.forum_threads for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "forum_threads_update" on public.forum_threads;
create policy "forum_threads_update"
on public.forum_threads for update
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "forum_threads_delete" on public.forum_threads;
create policy "forum_threads_delete"
on public.forum_threads for delete
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "forum_comments_select" on public.forum_comments;
create policy "forum_comments_select"
on public.forum_comments for select
to authenticated
using (true);

drop policy if exists "forum_comments_insert" on public.forum_comments;
create policy "forum_comments_insert"
on public.forum_comments for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "forum_comments_update" on public.forum_comments;
create policy "forum_comments_update"
on public.forum_comments for update
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "forum_comments_delete" on public.forum_comments;
create policy "forum_comments_delete"
on public.forum_comments for delete
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- stripe_events: no client access
drop policy if exists "stripe_events_none" on public.stripe_events;
create policy "stripe_events_none"
on public.stripe_events for select
to authenticated
using (false);

-- ============================================================
-- END
-- ============================================================
