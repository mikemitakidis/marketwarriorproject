-- Journal Tables for Market Warrior Trading Journal
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Journal Users table (for free journal signup - lead magnet)
CREATE TABLE IF NOT EXISTS journal_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    email_sequence_step INT DEFAULT 0,
    last_email_sent TIMESTAMP,
    converted_to_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Journal Trades table
CREATE TABLE IF NOT EXISTS journal_trades (
    id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT, -- Stock, Forex, Crypto, etc.
    direction TEXT NOT NULL, -- Long or Short
    entry_price DECIMAL,
    exit_price DECIMAL,
    quantity DECIMAL,
    pnl DECIMAL DEFAULT 0,
    fees DECIMAL DEFAULT 0,
    notes TEXT,
    strategy TEXT,
    status TEXT DEFAULT 'Closed',
    leverage DECIMAL DEFAULT 1,
    stop_loss DECIMAL,
    take_profit DECIMAL,
    return_pct TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Settings table (budget, preferences)
CREATE TABLE IF NOT EXISTS journal_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    budget DECIMAL DEFAULT 10000,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE journal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_trades
CREATE POLICY "Users can view own trades" ON journal_trades
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON journal_trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON journal_trades
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON journal_trades
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for journal_settings
CREATE POLICY "Users can view own settings" ON journal_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON journal_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON journal_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy for journal_users (admin only - for email marketing)
CREATE POLICY "Service role only" ON journal_users
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_trades_user_id ON journal_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_trades_date ON journal_trades(date);
CREATE INDEX IF NOT EXISTS idx_journal_users_email ON journal_users(email);

-- Grant permissions
GRANT ALL ON journal_trades TO authenticated;
GRANT ALL ON journal_settings TO authenticated;
