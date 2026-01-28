-- Migration: Create announcements table for live feed feature
-- Run this in Supabase SQL Editor

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  link_url text,
  link_text text,
  link_clicks int DEFAULT 0,
  type text NOT NULL DEFAULT 'student' CHECK (type IN ('student', 'public')),
  is_visible boolean DEFAULT true,
  background_color text DEFAULT '#3b82f6',
  text_color text DEFAULT '#ffffff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read visible announcements
CREATE POLICY "Anyone can read visible announcements"
  ON public.announcements FOR SELECT
  USING (is_visible = true);

-- Policy: Only service role can insert/update/delete (admin API uses service role)
CREATE POLICY "Service role can manage announcements"
  ON public.announcements FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_visible ON public.announcements(is_visible, type);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);

-- RPC function to atomically increment click count
CREATE OR REPLACE FUNCTION increment_announcement_clicks(announcement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.announcements
  SET link_clicks = link_clicks + 1
  WHERE id = announcement_id;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION increment_announcement_clicks(uuid) TO anon, authenticated;

-- Add comment
COMMENT ON TABLE public.announcements IS 'Announcement banners for students and public pages';
COMMENT ON COLUMN public.announcements.type IS 'student = visible on student pages only, public = visible everywhere including landing page';
COMMENT ON COLUMN public.announcements.link_clicks IS 'Counter for link click tracking';
