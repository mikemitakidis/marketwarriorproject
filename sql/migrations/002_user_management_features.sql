-- Migration: User Management Features
-- Date: 2026-01-23
-- Description: Add columns and tables for admin user management features

-- Add new columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id bigserial PRIMARY KEY,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role only for audit logs"
  ON admin_audit_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user
  ON admin_audit_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON admin_audit_logs(created_at DESC);

-- Add index for suspended users
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended
  ON user_profiles(suspended_until)
  WHERE suspended_until IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN user_profiles.suspended_until IS 'User is suspended from login until this timestamp';
COMMENT ON COLUMN user_profiles.suspension_reason IS 'Admin reason for suspension';
COMMENT ON COLUMN user_profiles.admin_notes IS 'Internal admin notes for support';
COMMENT ON TABLE admin_audit_logs IS 'Tracks all admin actions on user accounts';
