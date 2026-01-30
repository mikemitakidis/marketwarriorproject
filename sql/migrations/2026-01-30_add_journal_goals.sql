-- Migration: Add Trading Journal Goals Table
-- Run in Supabase SQL Editor

begin;

-- ============================================================================
-- 1. CREATE JOURNAL GOALS TABLE
-- ============================================================================

create table public.journal_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  -- Goal definition
  name text not null,
  description text,

  goal_type text not null
    check (goal_type in (
      'total_pnl',           -- Reach $X total profit
      'monthly_pnl',         -- Reach $X profit this month
      'win_rate',            -- Achieve X% win rate
      'avg_r_multiple',      -- Achieve X average R-multiple
      'max_drawdown',        -- Keep drawdown below X%
      'trades_count',        -- Complete X trades
      'consistency_streak',  -- X consecutive days following rules
      'profit_factor',       -- Achieve X profit factor
      'custom'               -- Custom goal
    )),

  -- Target and progress
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text not null default '$',  -- '$', '%', 'R', 'trades', 'days'

  -- Timeline
  start_date date not null default current_date,
  deadline date,

  -- Status
  status text not null default 'active'
    check (status in ('active', 'completed', 'failed', 'paused')),
  completed_at timestamptz,

  -- Milestones (optional checkpoints)
  milestones jsonb default '[]'::jsonb,
  -- Format: [{"value": 1000, "name": "First $1K", "completed": false, "completed_at": null}]

  -- Notes
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_journal_goals_updated_at
before update on public.journal_goals
for each row execute function public.set_updated_at();

create index idx_journal_goals_user on public.journal_goals(user_id, status);
create index idx_journal_goals_user_type on public.journal_goals(user_id, goal_type);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.journal_goals enable row level security;

-- ============================================================================
-- 3. CREATE RLS POLICIES
-- ============================================================================

create policy "Journal goals: read own"
on public.journal_goals for select
using (user_id = auth.uid());

create policy "Journal goals: insert own"
on public.journal_goals for insert
with check (user_id = auth.uid());

create policy "Journal goals: update own"
on public.journal_goals for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Journal goals: delete own"
on public.journal_goals for delete
using (user_id = auth.uid());

commit;
