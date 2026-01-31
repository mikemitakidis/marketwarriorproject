-- =====================================================
-- TRADING JOURNAL - COMPLETELY SEPARATE USER SYSTEM
-- Fresh start - removes all old user_id connections
-- Keeps design and tools, new user system only
-- =====================================================

-- 1. Create journal_users table (the ONLY user table for Trading Journal)
CREATE TABLE IF NOT EXISTS journal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  account_size DECIMAL(15,2) DEFAULT 10000,
  base_currency TEXT DEFAULT 'USD',
  default_risk_percent DECIMAL(5,2) DEFAULT 1.0,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_users_auth_user_id ON journal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_journal_users_email ON journal_users(email);

-- 2. Enable RLS on journal_users
ALTER TABLE journal_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journal profile" ON journal_users;
DROP POLICY IF EXISTS "Users can update own journal profile" ON journal_users;
DROP POLICY IF EXISTS "Users can insert own journal profile" ON journal_users;

CREATE POLICY "Users can view own journal profile" ON journal_users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own journal profile" ON journal_users
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own journal profile" ON journal_users
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- 3. Drop old user_id columns and add journal_user_id to all journal tables
-- This removes ALL connections to the course user system

-- journal_trades: Remove old user_id, add journal_user_id
ALTER TABLE journal_trades DROP CONSTRAINT IF EXISTS journal_trades_user_id_fkey;
ALTER TABLE journal_trades DROP COLUMN IF EXISTS user_id;
ALTER TABLE journal_trades ADD COLUMN IF NOT EXISTS journal_user_id UUID REFERENCES journal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_trades_journal_user ON journal_trades(journal_user_id);

-- journal_goals: Remove old user_id, add journal_user_id
ALTER TABLE journal_goals DROP CONSTRAINT IF EXISTS journal_goals_user_id_fkey;
ALTER TABLE journal_goals DROP COLUMN IF EXISTS user_id;
ALTER TABLE journal_goals ADD COLUMN IF NOT EXISTS journal_user_id UUID REFERENCES journal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_goals_journal_user ON journal_goals(journal_user_id);

-- journal_playbook: Remove old user_id, add journal_user_id
ALTER TABLE journal_playbook DROP CONSTRAINT IF EXISTS journal_playbook_user_id_fkey;
ALTER TABLE journal_playbook DROP COLUMN IF EXISTS user_id;
ALTER TABLE journal_playbook ADD COLUMN IF NOT EXISTS journal_user_id UUID REFERENCES journal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_playbook_journal_user ON journal_playbook(journal_user_id);

-- journal_tags: Remove old user_id, add journal_user_id
ALTER TABLE journal_tags DROP CONSTRAINT IF EXISTS journal_tags_user_id_fkey;
ALTER TABLE journal_tags DROP COLUMN IF EXISTS user_id;
ALTER TABLE journal_tags ADD COLUMN IF NOT EXISTS journal_user_id UUID REFERENCES journal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_tags_journal_user ON journal_tags(journal_user_id);

-- journal_violations: Remove old user_id, add journal_user_id
ALTER TABLE journal_violations DROP CONSTRAINT IF EXISTS journal_violations_user_id_fkey;
ALTER TABLE journal_violations DROP COLUMN IF EXISTS user_id;
ALTER TABLE journal_violations ADD COLUMN IF NOT EXISTS journal_user_id UUID REFERENCES journal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_violations_journal_user ON journal_violations(journal_user_id);

-- journal_screenshots: Remove old user_id, add journal_user_id
ALTER TABLE journal_screenshots DROP CONSTRAINT IF EXISTS journal_screenshots_user_id_fkey;
ALTER TABLE journal_screenshots DROP COLUMN IF EXISTS user_id;
ALTER TABLE journal_screenshots ADD COLUMN IF NOT EXISTS journal_user_id UUID REFERENCES journal_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_journal_screenshots_journal_user ON journal_screenshots(journal_user_id);

-- 4. Drop journal_settings table (settings are now in journal_users)
DROP TABLE IF EXISTS journal_settings;

-- 5. Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_journal_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_users_updated_at ON journal_users;
CREATE TRIGGER journal_users_updated_at
  BEFORE UPDATE ON journal_users
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_users_updated_at();

-- =====================================================
-- RESULT:
-- - Trading Journal has its own user table: journal_users
-- - ALL journal data uses journal_user_id only
-- - NO connection to course user_profiles
-- - Settings are stored in journal_users table
-- - Course students must register separately for journal
-- =====================================================
