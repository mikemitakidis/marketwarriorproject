-- Migration: Advanced Trading Journal Schema
-- Run in Supabase SQL Editor after backing up existing data
-- This adds comprehensive trading journal features for Phase 1

begin;

-- ============================================================================
-- 1. UPDATE USER_PROFILES: Add acquisition_source for user segmentation
-- ============================================================================

-- Add acquisition_source column (course vs journal-only users)
alter table public.user_profiles
add column if not exists acquisition_source text not null default 'unknown'
  check (acquisition_source in ('course', 'journal', 'unknown'));

comment on column public.user_profiles.acquisition_source is
  'User segmentation: course = bought 30-day challenge, journal = free journal user, unknown = legacy';

-- ============================================================================
-- 2. DROP OLD TRADING JOURNAL TABLE (if exists with old schema)
-- ============================================================================

-- We'll recreate with advanced schema
drop table if exists public.trading_journal_entries cascade;

-- ============================================================================
-- 3. CREATE JOURNAL SETTINGS TABLE (per-user preferences)
-- ============================================================================

create table public.journal_settings (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,

  -- Account settings
  account_size numeric not null default 10000,
  base_currency text not null default 'USD',
  default_risk_percent numeric not null default 1.0,
  default_commission numeric not null default 0,

  -- Trading sessions (for tagging)
  trading_sessions jsonb not null default '["London", "New York", "Asia"]'::jsonb,

  -- Display preferences
  show_r_multiples boolean not null default true,
  show_dollar_amounts boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_journal_settings_updated_at
before update on public.journal_settings
for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. CREATE JOURNAL TAGS TABLE (predefined + custom tags)
-- ============================================================================

create table public.journal_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete cascade,

  name text not null,
  category text not null default 'setup'
    check (category in ('setup', 'mistake', 'emotion', 'market_condition', 'custom')),
  color text not null default '#667eea',
  is_system boolean not null default false,

  created_at timestamptz not null default now(),

  -- System tags have null user_id, user tags have user_id
  unique(user_id, name, category)
);

-- Insert system-wide default tags
insert into public.journal_tags (user_id, name, category, color, is_system) values
  -- Setup tags
  (null, 'Breakout', 'setup', '#10b981', true),
  (null, 'Reversal', 'setup', '#f59e0b', true),
  (null, 'Trend Following', 'setup', '#3b82f6', true),
  (null, 'Range Trade', 'setup', '#8b5cf6', true),
  (null, 'Scalp', 'setup', '#ec4899', true),
  (null, 'Swing', 'setup', '#06b6d4', true),
  (null, 'News Trade', 'setup', '#ef4444', true),
  (null, 'Support Bounce', 'setup', '#22c55e', true),
  (null, 'Resistance Rejection', 'setup', '#f97316', true),
  (null, 'Fib 61.8', 'setup', '#a855f7', true),
  (null, 'VWAP', 'setup', '#14b8a6', true),
  (null, 'RSI Divergence', 'setup', '#6366f1', true),
  (null, 'MA Crossover', 'setup', '#84cc16', true),
  -- Mistake tags
  (null, 'FOMO', 'mistake', '#ef4444', true),
  (null, 'Revenge Trade', 'mistake', '#dc2626', true),
  (null, 'Early Exit', 'mistake', '#f97316', true),
  (null, 'Late Entry', 'mistake', '#fb923c', true),
  (null, 'No Stop Loss', 'mistake', '#b91c1c', true),
  (null, 'Oversize', 'mistake', '#991b1b', true),
  (null, 'Moved Stop', 'mistake', '#c2410c', true),
  (null, 'Chased Price', 'mistake', '#ea580c', true),
  -- Emotion tags
  (null, 'Calm', 'emotion', '#22c55e', true),
  (null, 'Confident', 'emotion', '#10b981', true),
  (null, 'Anxious', 'emotion', '#f59e0b', true),
  (null, 'Fearful', 'emotion', '#ef4444', true),
  (null, 'Greedy', 'emotion', '#dc2626', true),
  (null, 'Frustrated', 'emotion', '#b91c1c', true),
  (null, 'Bored', 'emotion', '#6b7280', true),
  (null, 'Euphoric', 'emotion', '#a855f7', true),
  -- Market condition tags
  (null, 'Trending', 'market_condition', '#3b82f6', true),
  (null, 'Ranging', 'market_condition', '#6b7280', true),
  (null, 'Volatile', 'market_condition', '#ef4444', true),
  (null, 'Low Volume', 'market_condition', '#9ca3af', true),
  (null, 'High Volume', 'market_condition', '#22c55e', true),
  (null, 'News Event', 'market_condition', '#f59e0b', true);

-- ============================================================================
-- 5. CREATE ADVANCED TRADES TABLE
-- ============================================================================

create table public.journal_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  -- Basic trade info
  symbol text not null,
  direction text not null check (direction in ('long', 'short')),
  asset_class text not null default 'stock'
    check (asset_class in ('stock', 'forex', 'crypto', 'futures', 'options', 'other')),

  -- Entry details
  entry_price numeric not null,
  entry_date timestamptz not null,
  quantity numeric not null,

  -- Exit details (null if still open)
  exit_price numeric,
  exit_date timestamptz,

  -- Risk management
  stop_loss numeric,
  take_profit numeric,
  initial_risk_amount numeric, -- Dollar risk at entry

  -- Calculated fields (updated on save)
  pnl_amount numeric,          -- Actual P&L in dollars
  pnl_percent numeric,         -- P&L as % of position
  r_multiple numeric,          -- P&L / Initial Risk
  holding_time_minutes int,    -- Time in trade

  -- Position management metrics (for MAE/MFE)
  max_adverse_excursion numeric,  -- Worst drawdown during trade
  max_favorable_excursion numeric, -- Best unrealized profit during trade

  -- Execution quality
  execution_score int check (execution_score >= 1 and execution_score <= 10),
  confidence_rating int check (confidence_rating >= 1 and confidence_rating <= 5),

  -- Context
  timeframe text,              -- e.g., '5m', '1h', '4h', 'D'
  session text,                -- London, New York, Asia
  strategy text,               -- User's strategy name

  -- Notes and media
  notes text,
  pre_trade_plan text,
  post_trade_review text,
  screenshot_url text,

  -- Status
  status text not null default 'open'
    check (status in ('open', 'closed', 'cancelled')),

  -- Fees
  commission numeric not null default 0,
  swap_fees numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_journal_trades_updated_at
before update on public.journal_trades
for each row execute function public.set_updated_at();

create index idx_journal_trades_user_date on public.journal_trades(user_id, entry_date desc);
create index idx_journal_trades_user_symbol on public.journal_trades(user_id, symbol);
create index idx_journal_trades_user_status on public.journal_trades(user_id, status);

-- ============================================================================
-- 6. CREATE TRADE-TAGS JUNCTION TABLE (many-to-many)
-- ============================================================================

create table public.journal_trade_tags (
  trade_id uuid not null references public.journal_trades(id) on delete cascade,
  tag_id uuid not null references public.journal_tags(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (trade_id, tag_id)
);

create index idx_journal_trade_tags_trade on public.journal_trade_tags(trade_id);
create index idx_journal_trade_tags_tag on public.journal_trade_tags(tag_id);

-- ============================================================================
-- 7. CREATE CHALLENGE RULES TABLE (user-defined trading rules)
-- ============================================================================

create table public.journal_challenge_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  rule_type text not null
    check (rule_type in (
      'max_daily_loss',       -- Max $ loss per day
      'max_daily_loss_pct',   -- Max % loss per day
      'max_trades_per_day',   -- Max number of trades
      'max_risk_per_trade',   -- Max % risk per trade
      'max_position_size',    -- Max position size
      'required_stop_loss',   -- Must have stop loss
      'min_rr_ratio',         -- Minimum Risk:Reward ratio
      'forbidden_instrument', -- Forbidden symbols/assets
      'trading_hours_only',   -- Only trade during set hours
      'custom'                -- Custom rule
    )),

  rule_value jsonb not null,  -- e.g., {"amount": 500} or {"percent": 2}
  description text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_journal_challenge_rules_updated_at
before update on public.journal_challenge_rules
for each row execute function public.set_updated_at();

create index idx_journal_challenge_rules_user on public.journal_challenge_rules(user_id, is_active);

-- ============================================================================
-- 8. CREATE RULE VIOLATIONS TABLE (breach log)
-- ============================================================================

create table public.journal_rule_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  rule_id uuid references public.journal_challenge_rules(id) on delete set null,
  trade_id uuid references public.journal_trades(id) on delete set null,

  rule_type text not null,
  violation_details jsonb not null,  -- What was violated and by how much
  severity text not null default 'warning'
    check (severity in ('warning', 'breach', 'critical')),

  acknowledged boolean not null default false,
  acknowledged_at timestamptz,

  created_at timestamptz not null default now()
);

create index idx_journal_rule_violations_user on public.journal_rule_violations(user_id, created_at desc);

-- ============================================================================
-- 9. CREATE DAILY REPORT CARDS TABLE
-- ============================================================================

create table public.journal_daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  report_date date not null,

  -- Daily stats (calculated from trades)
  total_trades int not null default 0,
  winning_trades int not null default 0,
  losing_trades int not null default 0,
  daily_pnl numeric not null default 0,
  daily_r_multiple numeric not null default 0,

  -- Self-assessment scores (1-10)
  discipline_score int check (discipline_score >= 1 and discipline_score <= 10),
  execution_score int check (execution_score >= 1 and execution_score <= 10),
  risk_management_score int check (risk_management_score >= 1 and risk_management_score <= 10),

  -- Consistency tracking
  followed_plan boolean,
  stayed_within_risk boolean,
  journaled_all_trades boolean,

  -- Psychology tracking (optional)
  sleep_quality int check (sleep_quality >= 1 and sleep_quality <= 5),
  stress_level int check (stress_level >= 1 and stress_level <= 5),
  focus_level int check (focus_level >= 1 and focus_level <= 5),

  -- Notes
  pre_market_plan text,
  post_market_review text,
  lessons_learned text,
  improvement_focus text,

  -- Calculated consistency score (0-100)
  consistency_score int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, report_date)
);

create trigger trg_journal_daily_reports_updated_at
before update on public.journal_daily_reports
for each row execute function public.set_updated_at();

create index idx_journal_daily_reports_user_date on public.journal_daily_reports(user_id, report_date desc);

-- ============================================================================
-- 10. CREATE PLAYBOOK TABLE (best trades / setups)
-- ============================================================================

create table public.journal_playbook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  name text not null,
  description text,

  -- Setup definition
  entry_rules text,
  exit_rules text,
  stop_loss_rules text,
  position_size_rules text,

  -- Best practices
  do_list jsonb,        -- ["Wait for confirmation", "Check volume"]
  dont_list jsonb,      -- ["Chase price", "Trade on news"]

  -- Example trades (linked)
  example_trade_ids uuid[],

  -- Screenshots/images
  screenshot_urls text[],

  -- Stats (calculated from linked trades)
  total_trades int not null default 0,
  win_rate numeric,
  avg_r_multiple numeric,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_journal_playbook_updated_at
before update on public.journal_playbook
for each row execute function public.set_updated_at();

create index idx_journal_playbook_user on public.journal_playbook(user_id, is_active);

-- ============================================================================
-- 11. CREATE SUPPORT PAYMENTS TABLE (voluntary donations)
-- ============================================================================

create table public.support_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  stripe_session_id text unique,
  stripe_payment_intent_id text,

  amount_cents int not null,
  currency text not null default 'usd',

  tier text, -- 'coffee', 'server', 'legend', 'custom'

  created_at timestamptz not null default now()
);

create index idx_support_payments_user on public.support_payments(user_id, created_at desc);

-- ============================================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.journal_settings enable row level security;
alter table public.journal_tags enable row level security;
alter table public.journal_trades enable row level security;
alter table public.journal_trade_tags enable row level security;
alter table public.journal_challenge_rules enable row level security;
alter table public.journal_rule_violations enable row level security;
alter table public.journal_daily_reports enable row level security;
alter table public.journal_playbook enable row level security;
alter table public.support_payments enable row level security;

-- ============================================================================
-- 13. CREATE RLS POLICIES
-- ============================================================================

-- Journal Settings
create policy "Journal settings: read own"
on public.journal_settings for select
using (user_id = auth.uid());

create policy "Journal settings: insert own"
on public.journal_settings for insert
with check (user_id = auth.uid());

create policy "Journal settings: update own"
on public.journal_settings for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Journal Tags (system tags readable by all, user tags only by owner)
create policy "Journal tags: read system tags"
on public.journal_tags for select
using (is_system = true or user_id = auth.uid());

create policy "Journal tags: insert own"
on public.journal_tags for insert
with check (user_id = auth.uid() and is_system = false);

create policy "Journal tags: update own"
on public.journal_tags for update
using (user_id = auth.uid() and is_system = false)
with check (user_id = auth.uid() and is_system = false);

create policy "Journal tags: delete own"
on public.journal_tags for delete
using (user_id = auth.uid() and is_system = false);

-- Journal Trades
create policy "Journal trades: read own"
on public.journal_trades for select
using (user_id = auth.uid());

create policy "Journal trades: insert own"
on public.journal_trades for insert
with check (user_id = auth.uid());

create policy "Journal trades: update own"
on public.journal_trades for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Journal trades: delete own"
on public.journal_trades for delete
using (user_id = auth.uid());

-- Journal Trade Tags
create policy "Journal trade tags: read own"
on public.journal_trade_tags for select
using (
  exists (
    select 1 from public.journal_trades t
    where t.id = trade_id and t.user_id = auth.uid()
  )
);

create policy "Journal trade tags: insert own"
on public.journal_trade_tags for insert
with check (
  exists (
    select 1 from public.journal_trades t
    where t.id = trade_id and t.user_id = auth.uid()
  )
);

create policy "Journal trade tags: delete own"
on public.journal_trade_tags for delete
using (
  exists (
    select 1 from public.journal_trades t
    where t.id = trade_id and t.user_id = auth.uid()
  )
);

-- Challenge Rules
create policy "Journal rules: read own"
on public.journal_challenge_rules for select
using (user_id = auth.uid());

create policy "Journal rules: insert own"
on public.journal_challenge_rules for insert
with check (user_id = auth.uid());

create policy "Journal rules: update own"
on public.journal_challenge_rules for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Journal rules: delete own"
on public.journal_challenge_rules for delete
using (user_id = auth.uid());

-- Rule Violations
create policy "Journal violations: read own"
on public.journal_rule_violations for select
using (user_id = auth.uid());

create policy "Journal violations: insert own"
on public.journal_rule_violations for insert
with check (user_id = auth.uid());

create policy "Journal violations: update own"
on public.journal_rule_violations for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Daily Reports
create policy "Journal daily reports: read own"
on public.journal_daily_reports for select
using (user_id = auth.uid());

create policy "Journal daily reports: insert own"
on public.journal_daily_reports for insert
with check (user_id = auth.uid());

create policy "Journal daily reports: update own"
on public.journal_daily_reports for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Playbook
create policy "Journal playbook: read own"
on public.journal_playbook for select
using (user_id = auth.uid());

create policy "Journal playbook: insert own"
on public.journal_playbook for insert
with check (user_id = auth.uid());

create policy "Journal playbook: update own"
on public.journal_playbook for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Journal playbook: delete own"
on public.journal_playbook for delete
using (user_id = auth.uid());

-- Support Payments (read own only, inserts via webhook)
create policy "Support payments: read own"
on public.support_payments for select
using (user_id = auth.uid());

-- ============================================================================
-- 14. HELPER FUNCTION: Calculate Consistency Score
-- ============================================================================

create or replace function public.calculate_consistency_score(
  p_user_id uuid,
  p_date date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score int := 0;
  v_trades_count int;
  v_total_pnl numeric;
  v_max_single_day_pnl numeric;
  v_risk_adherence_pct numeric;
  v_report record;
begin
  -- Get daily report
  select * into v_report
  from public.journal_daily_reports
  where user_id = p_user_id and report_date = p_date;

  if v_report is null then
    return 0;
  end if;

  -- Start with base score
  v_score := 50;

  -- Add points for following plan
  if v_report.followed_plan = true then
    v_score := v_score + 15;
  end if;

  -- Add points for staying within risk
  if v_report.stayed_within_risk = true then
    v_score := v_score + 15;
  end if;

  -- Add points for journaling all trades
  if v_report.journaled_all_trades = true then
    v_score := v_score + 10;
  end if;

  -- Add discipline score contribution (1-10 scale -> 0-10 points)
  if v_report.discipline_score is not null then
    v_score := v_score + v_report.discipline_score;
  end if;

  -- Cap at 100
  if v_score > 100 then
    v_score := 100;
  end if;

  return v_score;
end;
$$;

-- ============================================================================
-- 15. HELPER FUNCTION: Auto-create journal settings on first access
-- ============================================================================

create or replace function public.ensure_journal_settings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.journal_settings (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;
end;
$$;

-- ============================================================================
-- 16. INDEX FOR PERFORMANCE
-- ============================================================================

create index if not exists idx_user_profiles_acquisition on public.user_profiles(acquisition_source);

commit;
