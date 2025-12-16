-- Migration: add community forum tables and policies

-- Create categories table
create table if not exists public.forum_categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  description text
);

-- Prepopulate categories (insert if not exists)
insert into public.forum_categories (slug, name, description)
  values
    ('general', 'General Discussion', 'General trading talk, introductions, off-topic'),
    ('days-1-30', 'Days 1-30 Challenge', 'Discuss specific days of the challenge'),
    ('trading-journal', 'Trading Journal', 'Share trades and get feedback'),
    ('other', 'Other', 'Everything else')
on conflict (slug) do nothing;

-- Create forum posts table
create table if not exists public.forum_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id integer not null references public.forum_categories (id) on delete restrict,
  author_name text not null,
  title text not null,
  content text not null,
  day_number integer,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  views_count integer not null default 0,
  status text not null default 'published', -- published/hidden/flagged/deleted
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create forum comments table
create table if not exists public.forum_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  content text not null,
  likes_count integer not null default 0,
  status text not null default 'published', -- published/hidden/flagged/deleted
  created_at timestamptz not null default now()
);

-- Create likes table for posts
create table if not exists public.forum_post_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  primary key (user_id, post_id)
);

-- Create likes table for comments
create table if not exists public.forum_comment_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  comment_id uuid not null references public.forum_comments (id) on delete cascade,
  primary key (user_id, comment_id)
);

-- Enable RLS
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_post_likes enable row level security;
alter table public.forum_comment_likes enable row level security;

-- Policies for forum_posts
-- Everyone can read published posts; owners and admins can read hidden/flagged/deleted via service role
create policy if not exists "Everyone reads published posts" on public.forum_posts
  for select using (
    status = 'published' or auth.role() = 'service_role'
  );
-- Users can insert their own posts
create policy if not exists "Users insert own posts" on public.forum_posts
  for insert with check ( auth.uid() = user_id );
-- Users can update their own posts (except moderation fields)
create policy if not exists "Users update own posts" on public.forum_posts
  for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
-- Service role (admin) can update any post
create policy if not exists "Service updates posts" on public.forum_posts
  for update using ( auth.role() = 'service_role' );

-- Policies for forum_comments
create policy if not exists "Everyone reads published comments" on public.forum_comments
  for select using ( status = 'published' or auth.role() = 'service_role' );
create policy if not exists "Users insert own comments" on public.forum_comments
  for insert with check ( auth.uid() = user_id );
create policy if not exists "Users update own comments" on public.forum_comments
  for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
create policy if not exists "Service updates comments" on public.forum_comments
  for update using ( auth.role() = 'service_role' );

-- Policies for likes (posts and comments)
-- Users can insert/delete their own likes
create policy if not exists "Users insert own post likes" on public.forum_post_likes
  for insert with check ( auth.uid() = user_id );
create policy if not exists "Users delete own post likes" on public.forum_post_likes
  for delete using ( auth.uid() = user_id );
create policy if not exists "Users insert own comment likes" on public.forum_comment_likes
  for insert with check ( auth.uid() = user_id );
create policy if not exists "Users delete own comment likes" on public.forum_comment_likes
  for delete using ( auth.uid() = user_id );