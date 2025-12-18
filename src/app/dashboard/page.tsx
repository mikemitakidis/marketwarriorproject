import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DAY_TITLES, type UserProgress, type DayStatus } from '@/lib/types'
import LogoutButton from '@/components/LogoutButton'

interface DayInfo {
  day: number
  title: string
  status: DayStatus
  progress?: UserProgress
  timeRemaining?: string
}

function getTimeRemaining(completedAt: string): string {
  const completed = new Date(completedAt)
  const unlockTime = new Date(completed.getTime() + 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = unlockTime.getTime() - now.getTime()

  if (diff <= 0) return ''

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}m`
}

function getDayStatus(
  dayNumber: number,
  progressMap: Map<number, UserProgress>
): { status: DayStatus; timeRemaining?: string } {
  const progress = progressMap.get(dayNumber)
  const prevProgress = progressMap.get(dayNumber - 1)

  // Day 1 is always accessible
  if (dayNumber === 1) {
    if (progress?.quiz_passed) return { status: 'completed' }
    if (progress?.started_at) return { status: 'in-progress' }
    return { status: 'unlocked' }
  }

  // Check if completed
  if (progress?.quiz_passed) {
    return { status: 'completed' }
  }

  // Check if in progress
  if (progress?.started_at) {
    return { status: 'in-progress' }
  }

  // Check if previous day is completed
  if (!prevProgress?.quiz_passed) {
    return { status: 'locked' }
  }

  // Check 24-hour time lock
  if (prevProgress.completed_at) {
    const completed = new Date(prevProgress.completed_at)
    const unlockTime = new Date(completed.getTime() + 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now < unlockTime) {
      return {
        status: 'time-locked',
        timeRemaining: getTimeRemaining(prevProgress.completed_at)
      }
    }
  }

  return { status: 'unlocked' }
}

function getStatusIcon(status: DayStatus): string {
  switch (status) {
    case 'completed': return '✅'
    case 'in-progress': return '📖'
    case 'unlocked': return '🔓'
    case 'time-locked': return '⏳'
    case 'locked': return '🔒'
  }
}

function getStatusColor(status: DayStatus): string {
  switch (status) {
    case 'completed': return 'border-emerald-500 bg-emerald-900/20'
    case 'in-progress': return 'border-yellow-500 bg-yellow-900/20'
    case 'unlocked': return 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30'
    case 'time-locked': return 'border-orange-500 bg-orange-900/20'
    case 'locked': return 'border-gray-700 bg-gray-900/50 opacity-60'
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Check welcome completion
  if (!profile.full_name || !profile.terms_accepted) {
    redirect('/welcome')
  }

  // Check payment
  if (!profile.has_paid) {
    redirect('/pay')
  }

  // Get all progress for user
  const { data: progressData } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('day_number')

  const progressMap = new Map<number, UserProgress>()
  progressData?.forEach(p => progressMap.set(p.day_number, p))

  // Calculate stats
  const completedDays = progressData?.filter(p => p.quiz_passed).length || 0
  const totalScore = progressData?.reduce((sum, p) => sum + (p.quiz_score || 0), 0) || 0
  const avgScore = completedDays > 0 ? Math.round(totalScore / completedDays) : 0
  const progressPercent = Math.round((completedDays / 30) * 100)

  // Build day info array
  const days: DayInfo[] = []
  for (let i = 1; i <= 30; i++) {
    const { status, timeRemaining } = getDayStatus(i, progressMap)
    days.push({
      day: i,
      title: DAY_TITLES[i] || `Day ${i}`,
      status,
      progress: progressMap.get(i),
      timeRemaining
    })
  }

  // Find current day (first unlocked or in-progress day)
  const currentDay = days.find(d => d.status === 'in-progress' || d.status === 'unlocked')?.day || 1

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-emerald-500">Market Warrior</h1>
          <nav className="flex items-center gap-4">
            <Link href="/community" className="text-gray-400 hover:text-white text-sm">
              Community
            </Link>
            <Link href="/journal" className="text-gray-400 hover:text-white text-sm">
              Journal
            </Link>
            <Link href="/affiliate" className="text-gray-400 hover:text-white text-sm">
              Affiliate
            </Link>
            {profile.is_admin && (
              <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
                Admin
              </Link>
            )}
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {profile.full_name}!</h2>
          <p className="text-gray-400">Continue your 30-day trading challenge</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Progress</p>
            <p className="text-3xl font-bold text-emerald-500">{progressPercent}%</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Days Completed</p>
            <p className="text-3xl font-bold">{completedDays}/30</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Avg Quiz Score</p>
            <p className="text-3xl font-bold">{avgScore}%</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-1">Current Day</p>
            <p className="text-3xl font-bold">{currentDay}</p>
          </div>
        </div>

        {/* Continue Button */}
        {completedDays < 30 && (
          <div className="mb-8">
            <Link
              href={`/days/${currentDay}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              Continue Day {currentDay}: {DAY_TITLES[currentDay]}
              <span>→</span>
            </Link>
          </div>
        )}

        {/* Certificate Button */}
        {completedDays === 30 && (
          <div className="mb-8">
            <Link href="/certificate" className="btn-primary inline-flex items-center gap-2">
              🏆 View Your Certificate
            </Link>
          </div>
        )}

        {/* Day Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {days.map((day) => {
            const isClickable = day.status === 'completed' || day.status === 'in-progress' || day.status === 'unlocked'
            const Component = isClickable ? Link : 'div'
            
            return (
              <Component
                key={day.day}
                href={isClickable ? `/days/${day.day}` : '#'}
                className={`card border-2 ${getStatusColor(day.status)} transition-all cursor-${isClickable ? 'pointer' : 'default'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">Day {day.day}</span>
                  <span className="text-xl">{getStatusIcon(day.status)}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{day.title}</p>
                {day.progress?.quiz_score !== undefined && day.progress?.quiz_score !== null && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Score: {day.progress.quiz_score}%
                  </p>
                )}
                {day.timeRemaining && (
                  <p className="text-xs text-orange-400 mt-1">
                    Unlocks in {day.timeRemaining}
                  </p>
                )}
              </Component>
            )
          })}
        </div>
      </main>
    </div>
  )
}
