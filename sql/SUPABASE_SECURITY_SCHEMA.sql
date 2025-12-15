-- Supabase Security Schema for Market Warrior
--
-- This script defines the database tables and row level security
-- policies required for the Market Warrior challenge.  Each table is
-- configured with sensible defaults and appropriate RLS to ensure
-- users can only access their own data.  See the handoff
-- documentation for details on migrating to a new Supabase project.

-- Extensions
create extension if not exists "uuid-ossp";

-- user_profiles
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  stripe_customer_id text,
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;
create policy "Profiles are viewable by owner" on public.user_profiles
  for select using ( auth.uid() = id );
create policy "Users can update own profile" on public.user_profiles
  for update using ( auth.uid() = id );

-- challenge_progress
create table if not exists public.challenge_progress (
  user_id uuid references auth.users (id) on delete cascade,
  day integer not null,
  available_at timestamptz not null,
  completed_at timestamptz,
  primary key (user_id, day)
);
alter table public.challenge_progress enable row level security;
create policy "Read own progress" on public.challenge_progress
  for select using ( auth.uid() = user_id );
create policy "Update own progress" on public.challenge_progress
  for update using ( auth.uid() = user_id );
create policy "Insert progress (service)" on public.challenge_progress
  for insert to public.challenge_progress with check ( auth.role() = 'service_role' );

-- quiz_questions
create table if not exists public.quiz_questions (
  id bigserial primary key,
  day integer not null,
  question text not null,
  options text[] not null,
  correct_answer text not null
);
alter table public.quiz_questions enable row level security;
-- Only service role can select or modify quiz questions; anonymous
-- clients must request via server API which strips correct answers.
create policy "Service role only" on public.quiz_questions
  for all using ( auth.role() = 'service_role' );

-- quiz_results
create table if not exists public.quiz_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  day integer not null,
  score integer not null,
  total integer not null,
  created_at timestamptz default now(),
  primary key (user_id, day)
);
alter table public.quiz_results enable row level security;
create policy "Read own quiz results" on public.quiz_results
  for select using ( auth.uid() = user_id );
create policy "Upsert own results" on public.quiz_results
  for insert with check ( auth.uid() = user_id );
create policy "Update own results" on public.quiz_results
  for update using ( auth.uid() = user_id );

-- task_submissions
create table if not exists public.task_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day integer not null,
  response text not null,
  created_at timestamptz default now()
);
alter table public.task_submissions enable row level security;
create policy "Read own task submissions" on public.task_submissions
  for select using ( auth.uid() = user_id );
create policy "Create own task submissions" on public.task_submissions
  for insert with check ( auth.uid() = user_id );

-- course_content
create table if not exists public.course_content (
  day integer primary key,
  html_content text not null,
  video_url text,
  task_prompt text
);
alter table public.course_content enable row level security;
create policy "Service only access" on public.course_content
  for all using ( auth.role() = 'service_role' );

-- payments
create table if not exists public.payments (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text unique not null,
  amount bigint not null,
  currency text not null,
  created_at timestamptz default now()
);
alter table public.payments enable row level security;
create policy "Service only payments" on public.payments
  for all using ( auth.role() = 'service_role' );

-- trading journal
create table if not exists public.trading_journal (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  direction text not null,
  result text not null,
  created_at timestamptz default now()
);
alter table public.trading_journal enable row level security;
create policy "Read own journal" on public.trading_journal
  for select using ( auth.uid() = user_id );
create policy "Insert journal entry" on public.trading_journal
  for insert with check ( auth.uid() = user_id );
-- Additional policy to allow updates or deletes by owner if required

-- announcements (optional)
create table if not exists public.announcements (
  id bigserial primary key,
  title text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "Announcements accessible to all" on public.announcements
  for select using ( true );
create policy "Admin can insert announcements" on public.announcements
  for insert with check ( auth.role() = 'service_role' );