-- Certificate system: stores issued certificates
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  certificate_id TEXT NOT NULL UNIQUE,  -- MW-XXXX format
  full_name TEXT NOT NULL,
  completion_date DATE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  issued_by TEXT DEFAULT 'system',  -- 'system' for auto, admin email for manual
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX idx_certificates_certificate_id ON public.certificates(certificate_id);

-- RLS policies
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can read their own certificates
CREATE POLICY "Users can view own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes using getServiceSupabase)
CREATE POLICY "Service role full access"
  ON public.certificates FOR ALL
  USING (true)
  WITH CHECK (true);
