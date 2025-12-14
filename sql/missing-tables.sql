-- ============================================
-- MISSING TABLES - Run this in Supabase SQL Editor
-- ============================================

-- 1. PROMO CODES - For discount codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  discount_percent integer NOT NULL,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. SITE SETTINGS - For admin configuration
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default settings
INSERT INTO site_settings (setting_key, setting_value) VALUES
  ('course_price', '39.99'),
  ('max_devices', '2'),
  ('access_days', '120'),
  ('affiliate_rate_free', '0.25'),
  ('affiliate_rate_paid', '0.30')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. TRADING JOURNAL - For the free journal feature
CREATE TABLE IF NOT EXISTS trading_journal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date date NOT NULL,
  symbol text NOT NULL,
  trade_type text NOT NULL, -- 'buy' or 'sell'
  entry_price decimal(12,4),
  exit_price decimal(12,4),
  quantity decimal(12,4),
  profit_loss decimal(12,2),
  notes text,
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. JOURNAL LEADS - For lead magnet signups
CREATE TABLE IF NOT EXISTS journal_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  source text DEFAULT 'journal_signup',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. ACTIVITY LOG - For admin audit trail (optional)
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Promo codes: public read for validation, admin write
CREATE POLICY "Anyone can read active promo codes" ON promo_codes
  FOR SELECT USING (is_active = true);

-- Site settings: public read
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

-- Trading journal: users can CRUD their own entries
CREATE POLICY "Users can view own journal" ON trading_journal
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal" ON trading_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal" ON trading_journal
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal" ON trading_journal
  FOR DELETE USING (auth.uid() = user_id);

-- Journal leads: insert only (no read by users)
CREATE POLICY "Anyone can signup for journal" ON journal_leads
  FOR INSERT WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trading_journal_user_id ON trading_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_journal_trade_date ON trading_journal(trade_date);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_journal_leads_email ON journal_leads(email);

