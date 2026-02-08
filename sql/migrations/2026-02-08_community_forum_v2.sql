-- Migration: Community Forum V2 - Full rebuild with categories, likes, views
-- This replaces the old forum_threads/forum_comments schema with the new spec.
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- 1. Drop old forum tables (no real data — test only)
-- ============================================================
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;

-- Also drop new-style tables if they exist (safe re-run)
DROP TABLE IF EXISTS public.forum_comment_likes CASCADE;
DROP TABLE IF EXISTS public.forum_post_likes CASCADE;
DROP TABLE IF EXISTS public.forum_post_views CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;

-- ============================================================
-- 2. Create forum_categories
-- ============================================================
CREATE TABLE public.forum_categories (
  id serial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text
);

INSERT INTO public.forum_categories (slug, name, description) VALUES
  ('general', 'General Discussion', 'General trading talk, introductions, off-topic'),
  ('days-1-30', 'Days 1-30 Challenge', 'Discuss specific days of the challenge'),
  ('trading-journal', 'Trading Journal', 'Share trades and get feedback'),
  ('other', 'Other', 'Everything else');

-- ============================================================
-- 3. Create forum_posts
-- ============================================================
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES public.forum_categories (id) ON DELETE RESTRICT,
  author_name text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  day_number integer,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraint: day_number only valid for days-1-30 category (1-30)
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_day_number_check
  CHECK (day_number IS NULL OR (day_number >= 1 AND day_number <= 30));

-- Constraint: status must be one of the allowed values
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_status_check
  CHECK (status IN ('published', 'hidden', 'flagged', 'deleted'));

-- ============================================================
-- 4. Create forum_comments
-- ============================================================
CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES public.forum_posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_comments
  ADD CONSTRAINT forum_comments_status_check
  CHECK (status IN ('published', 'hidden', 'flagged', 'deleted'));

-- ============================================================
-- 5. Create forum_post_likes
-- ============================================================
CREATE TABLE public.forum_post_likes (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.forum_posts (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- 6. Create forum_comment_likes
-- ============================================================
CREATE TABLE public.forum_comment_likes (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.forum_comments (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- ============================================================
-- 7. Create forum_post_views (deduplication)
-- ============================================================
CREATE TABLE public.forum_post_views (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.forum_posts (id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- 8. Indexes for performance
-- ============================================================
CREATE INDEX idx_forum_posts_category ON public.forum_posts (category_id);
CREATE INDEX idx_forum_posts_status ON public.forum_posts (status);
CREATE INDEX idx_forum_posts_created ON public.forum_posts (created_at DESC);
CREATE INDEX idx_forum_posts_pinned ON public.forum_posts (is_pinned DESC, created_at DESC);
CREATE INDEX idx_forum_posts_day ON public.forum_posts (day_number) WHERE day_number IS NOT NULL;
CREATE INDEX idx_forum_comments_post ON public.forum_comments (post_id);
CREATE INDEX idx_forum_comments_status ON public.forum_comments (status);

-- ============================================================
-- 9. Enable RLS
-- ============================================================
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_views ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read
CREATE POLICY "Anyone reads categories" ON public.forum_categories
  FOR SELECT USING (true);

-- Posts: read published, service_role reads all
CREATE POLICY "Read published posts" ON public.forum_posts
  FOR SELECT USING (status = 'published' OR auth.role() = 'service_role');
CREATE POLICY "Users insert own posts" ON public.forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages posts" ON public.forum_posts
  FOR ALL USING (auth.role() = 'service_role');

-- Comments: read published, service_role reads all
CREATE POLICY "Read published comments" ON public.forum_comments
  FOR SELECT USING (status = 'published' OR auth.role() = 'service_role');
CREATE POLICY "Users insert own comments" ON public.forum_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages comments" ON public.forum_comments
  FOR ALL USING (auth.role() = 'service_role');

-- Likes: users manage their own
CREATE POLICY "Users manage post likes" ON public.forum_post_likes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role manages post likes" ON public.forum_post_likes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users manage comment likes" ON public.forum_comment_likes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role manages comment likes" ON public.forum_comment_likes
  FOR ALL USING (auth.role() = 'service_role');

-- Views: users insert own, service_role manages all
CREATE POLICY "Users insert own views" ON public.forum_post_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages views" ON public.forum_post_views
  FOR ALL USING (auth.role() = 'service_role');
