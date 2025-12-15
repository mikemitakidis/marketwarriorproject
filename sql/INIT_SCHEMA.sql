-- Market Warrior Supabase schema and RLS policies
--
-- This script defines all tables, columns, and row level security
-- policies required for the 30‑day Market Warrior challenge.  Run
-- this file in a fresh Supabase project before launching the app.

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Table: user_profiles
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  stripe_customer_id text,
  is_admin boolean default false,
  has_paid boolean default false,
  challenge_start_date timestamptz,
  access_expires_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;
create policy "Users can view own profile" on public.user_profiles
  for select using ( auth.uid() = id );
create policy "Users can update own profile" on public.user_profiles
  for update using ( auth.uid() = id );
-- Only service role (and admin) can insert profiles
create policy "Service inserts profiles" on public.user_profiles
  for insert with check ( auth.role() = 'service_role' );

-- Table: payments
create table if not exists public.payments (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade,
  session_id text unique not null,
  amount bigint not null,
  currency text not null,
  has_paid boolean default false,
  challenge_start_date timestamptz,
  access_expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.payments enable row level security;
create policy "Service only payments" on public.payments
  for all using ( auth.role() = 'service_role' );

-- Table: course_content
create table if not exists public.course_content (
  day integer primary key,
  html_content text not null,
  video_url text,
  task_prompt text
);
alter table public.course_content enable row level security;
create policy "Service only access content" on public.course_content
  for all using ( auth.role() = 'service_role' );

-- Table: quiz_questions
create table if not exists public.quiz_questions (
  id bigserial primary key,
  day integer not null,
  question text not null,
  options text[] not null,
  correct_answer text not null
);
alter table public.quiz_questions enable row level security;
create policy "Service only access quiz" on public.quiz_questions
  for all using ( auth.role() = 'service_role' );

-- Table: quiz_results
create table if not exists public.quiz_results (
  user_id uuid references auth.users (id) on delete cascade,
  day integer not null,
  score integer not null,
  total integer not null,
  created_at timestamptz default now(),
  primary key (user_id, day)
);
alter table public.quiz_results enable row level security;
create policy "Users can view own quiz results" on public.quiz_results
  for select using ( auth.uid() = user_id );
create policy "Users can insert own quiz results" on public.quiz_results
  for insert with check ( auth.uid() = user_id );
create policy "Users can update own quiz results" on public.quiz_results
  for update using ( auth.uid() = user_id );

-- Table: task_submissions
create table if not exists public.task_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  day integer not null,
  response text not null,
  created_at timestamptz default now()
);
alter table public.task_submissions enable row level security;
create policy "Users can view own tasks" on public.task_submissions
  for select using ( auth.uid() = user_id );
create policy "Users can insert own tasks" on public.task_submissions
  for insert with check ( auth.uid() = user_id );

-- Table: challenge_progress
create table if not exists public.challenge_progress (
  user_id uuid references auth.users (id) on delete cascade,
  day integer not null,
  available_at timestamptz not null,
  completed_at timestamptz,
  quiz_passed boolean default false,
  primary key (user_id, day)
);
alter table public.challenge_progress enable row level security;
create policy "Users can view own progress" on public.challenge_progress
  for select using ( auth.uid() = user_id );
create policy "Users can update own progress" on public.challenge_progress
  for update using ( auth.uid() = user_id );
create policy "Service inserts progress" on public.challenge_progress
  for insert with check ( auth.role() = 'service_role' );

-- Table: trading_journal (paid version)
create table if not exists public.trading_journal (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  symbol text not null,
  direction text not null,
  result text not null,
  created_at timestamptz default now()
);
alter table public.trading_journal enable row level security;
create policy "Users can view own journal" on public.trading_journal
  for select using ( auth.uid() = user_id );
create policy "Users can insert own journal" on public.trading_journal
  for insert with check ( auth.uid() = user_id );

-- Table: leads_journal (marketing version)
create table if not exists public.leads_journal (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null,
  symbol text not null,
  direction text not null,
  result text not null,
  created_at timestamptz default now()
);
alter table public.leads_journal enable row level security;
create policy "Lead can view own entries" on public.leads_journal
  for select using ( auth.uid() = user_id );
create policy "Lead can insert own entries" on public.leads_journal
  for insert with check ( auth.uid() = user_id );

-- Table: certificates
create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  issued_at timestamptz not null,
  certificate_url text not null
);
alter table public.certificates enable row level security;
create policy "Users can view own certificate" on public.certificates
  for select using ( auth.uid() = user_id );
create policy "Admin can insert certificates" on public.certificates
  for insert with check ( auth.role() = 'service_role' );

-- Table: announcements
create table if not exists public.announcements (
  id bigserial primary key,
  title text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "Announcements readable by all" on public.announcements
  for select using ( true );
create policy "Admin inserts announcements" on public.announcements
  for insert with check ( auth.role() = 'service_role' );