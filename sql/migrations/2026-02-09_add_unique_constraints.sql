-- Migration: Add UNIQUE constraints to prevent duplicate records
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. UNIQUE constraint on task_submissions (user_id, day)
-- Prevents the same user from submitting a task twice for the same day
-- ============================================

-- First, clean up any existing duplicates (keep the earliest submission)
DELETE FROM public.task_submissions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, day) id
  FROM public.task_submissions
  ORDER BY user_id, day, created_at ASC
);

-- Now add the constraint
ALTER TABLE public.task_submissions
ADD CONSTRAINT unique_task_per_user_day UNIQUE (user_id, day);

-- ============================================
-- 2. UNIQUE constraint on payments (stripe_session_id)
-- Prevents duplicate payment records from webhook retries
-- ============================================

-- First, clean up any existing duplicates (keep the earliest payment record)
-- Only clean where stripe_session_id is NOT NULL (some old records might be null)
DELETE FROM public.payments
WHERE id NOT IN (
  SELECT DISTINCT ON (stripe_session_id) id
  FROM public.payments
  WHERE stripe_session_id IS NOT NULL
  ORDER BY stripe_session_id, created_at ASC
)
AND stripe_session_id IS NOT NULL;

-- Add UNIQUE constraint (allows NULL values - only enforces uniqueness on non-null values)
ALTER TABLE public.payments
ADD CONSTRAINT unique_stripe_session_id UNIQUE (stripe_session_id);
