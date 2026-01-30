-- Migration: Add AI Rate Limit Columns
-- Adds columns to track daily AI requests per user

-- Add columns for AI request rate limiting
alter table public.user_profiles
add column if not exists ai_requests_today int not null default 0;

alter table public.user_profiles
add column if not exists ai_requests_date date;

comment on column public.user_profiles.ai_requests_today is
  'Number of AI Coach requests made today (resets daily)';

comment on column public.user_profiles.ai_requests_date is
  'Date of last AI request (for daily reset logic)';
