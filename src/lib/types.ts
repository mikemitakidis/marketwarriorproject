// Quiz pass rate - 60%
export const QUIZ_PASS_RATE = 0.60

// Day titles for all 30 days
export const DAY_TITLES: Record<number, string> = {
  1: 'Introduction to Trading',
  2: 'Understanding Markets',
  3: 'Chart Basics',
  4: 'Candlestick Patterns',
  5: 'Support and Resistance',
  6: 'Trend Analysis',
  7: 'Moving Averages',
  8: 'Volume Analysis',
  9: 'Technical Indicators',
  10: 'RSI and MACD',
  11: 'Bollinger Bands',
  12: 'Chart Patterns',
  13: 'Entry Strategies',
  14: 'Exit Strategies',
  15: 'Risk Management',
  16: 'Moving Average Crossovers',
  17: 'Fibonacci Retracements',
  18: 'Backtesting Strategies',
  19: 'Trading Psychology',
  20: 'Emotional Control',
  21: 'Building a Trading Plan',
  22: 'Position Sizing',
  23: 'Market Analysis',
  24: 'News Trading',
  25: 'Sector Analysis',
  26: 'Advanced Patterns',
  27: 'Multi-Timeframe Analysis',
  28: 'Trade Management',
  29: 'Portfolio Building',
  30: 'Final Assessment'
}

// User profile interface
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  has_paid: boolean
  is_admin: boolean
  challenge_start_date: string | null
  terms_accepted: boolean
  referral_code: string | null
  referred_by: string | null
  created_at: string
  updated_at: string
}

// User progress interface
export interface UserProgress {
  id: string
  user_id: string
  day_number: number
  started_at: string | null
  completed_at: string | null
  quiz_score: number | null
  quiz_passed: boolean
  quiz_attempts: number
  created_at: string
  updated_at: string
}

// Quiz question interface
export interface QuizQuestion {
  id: string
  day_number: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
  order_index: number
}

// Quiz attempt interface
export interface QuizAttempt {
  id: string
  user_id: string
  day_number: number
  score: number
  passed: boolean
  answers: Record<string, string>
  created_at: string
}

// Journal entry interface
export interface JournalEntry {
  id: string
  user_id: string
  trade_date: string
  symbol: string
  direction: 'LONG' | 'SHORT'
  entry_price: number
  exit_price: number | null
  stop_loss: number | null
  take_profit: number | null
  position_size: number
  notes: string | null
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN' | null
  pnl: number | null
  created_at: string
  updated_at: string
}

// Forum post interface
export interface ForumPost {
  id: string
  user_id: string
  title: string
  content: string
  category: string
  is_pinned: boolean
  likes_count: number
  replies_count: number
  created_at: string
  updated_at: string
  author?: {
    full_name: string | null
    email: string
  }
}

// Forum reply interface
export interface ForumReply {
  id: string
  post_id: string
  user_id: string
  content: string
  likes_count: number
  created_at: string
  updated_at: string
  author?: {
    full_name: string | null
    email: string
  }
}

// Certificate interface
export interface Certificate {
  id: string
  user_id: string
  certificate_number: string
  issued_at: string
  full_name: string
  completion_date: string
}

// Affiliate profile interface
export interface AffiliateProfile {
  id: string
  user_id: string
  referral_code: string
  total_referrals: number
  paid_referrals: number
  total_earnings: number
  pending_earnings: number
  paid_out: number
  is_active: boolean
  created_at: string
}

// Day status for dashboard
export type DayStatus = 'completed' | 'in-progress' | 'unlocked' | 'time-locked' | 'locked'

export interface DayInfo {
  day: number
  title: string
  status: DayStatus
  progress?: UserProgress
  timeRemaining?: string
}
