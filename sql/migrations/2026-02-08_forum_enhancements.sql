-- Migration: Community Forum Enhancements
-- Adds: reports table, ban fields, image support on posts
-- Run this in the Supabase SQL Editor AFTER the v2 migration.

-- ============================================================
-- 1. Add ban/mute fields to user_profiles
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_forum_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forum_ban_reason text;

-- ============================================================
-- 2. Create forum_reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_type text NOT NULL, -- 'post' or 'comment'
  post_id uuid REFERENCES public.forum_posts (id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.forum_comments (id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, dismissed
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_reports_target_check CHECK (
    (target_type = 'post' AND post_id IS NOT NULL) OR
    (target_type = 'comment' AND comment_id IS NOT NULL)
  ),
  CONSTRAINT forum_reports_status_check CHECK (
    status IN ('pending', 'dismissed')
  )
);

-- Prevent duplicate reports from same user on same target
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_reports_unique_post
  ON public.forum_reports (reporter_id, post_id) WHERE target_type = 'post';
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_reports_unique_comment
  ON public.forum_reports (reporter_id, comment_id) WHERE target_type = 'comment';

CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON public.forum_reports (status);
CREATE INDEX IF NOT EXISTS idx_forum_reports_post ON public.forum_reports (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_reports_comment ON public.forum_reports (comment_id) WHERE comment_id IS NOT NULL;

-- RLS for forum_reports
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reports" ON public.forum_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Service role manages reports" ON public.forum_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 3. Add image_url to forum_posts
-- ============================================================
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================
-- 4. Create storage bucket for forum uploads (if not exists)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-uploads', 'forum-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, anyone can read (public bucket)
CREATE POLICY "Authenticated users upload forum files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'forum-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can read forum files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-uploads');

CREATE POLICY "Service role manages forum files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'forum-uploads' AND auth.role() = 'service_role');
