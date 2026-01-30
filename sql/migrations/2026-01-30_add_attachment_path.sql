-- Migration: Add attachment_path column to task_submissions
-- This allows regenerating signed URLs for old submissions
-- Run in Supabase SQL Editor

-- Add attachment_path column (stores the Supabase storage path)
ALTER TABLE public.task_submissions
ADD COLUMN IF NOT EXISTS attachment_path text;

-- Add comment explaining the columns
COMMENT ON COLUMN public.task_submissions.attachment_url IS 'Signed URL (may expire after 7 days) - kept for backward compatibility';
COMMENT ON COLUMN public.task_submissions.attachment_path IS 'Storage path in Supabase - use this to generate fresh signed URLs';
