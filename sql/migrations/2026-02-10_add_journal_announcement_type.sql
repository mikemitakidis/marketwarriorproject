-- Migration: Add 'journal' announcement type
-- Run this in Supabase SQL Editor

-- Update the CHECK constraint to allow 'journal' type
ALTER TABLE public.announcements
DROP CONSTRAINT IF EXISTS announcements_type_check;

ALTER TABLE public.announcements
ADD CONSTRAINT announcements_type_check
CHECK (type IN ('student', 'public', 'journal'));
