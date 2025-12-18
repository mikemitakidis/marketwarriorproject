import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DAY_TITLES } from '@/lib/types'
import DayContent from '@/components/DayContent'
import Quiz from '@/components/Quiz'

interface PageProps {
  params: Promise<{ day: string }>
}

export default async function DayPage({ params }: PageProps) {
  const { day: dayParam } = await params
  const dayNumber = parseInt(dayParam)

  // Validate day number
  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check payment
  const { data: profile } = await supabase
    .from('users')
    .select('has_paid')
    .eq('id', user.id)
    .single()

  if (!profile?.has_paid) {
    redirect('/pay')
  }

  // Get all progress to check unlock status
  const { data: allProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)

  const progressMap = new Map<number, any>()
  allProgress?.forEach(p => progressMap.set(p.day_number, p))

  // Check if day is accessible
  if (dayNumber > 1) {
    const prevProgress = progressMap.get(dayNumber - 1)
    
    // Previous day must be completed
    if (!prevProgress?.quiz_passed) {
      redirect(`/dashboard?error=complete_previous`)
    }

    // Check 24-hour lock
    if (prevProgress.completed_at) {
      const completed = new Date(prevProgress.completed_at)
      const unlockTime = new Date(completed.getTime() + 24 * 60 * 60 * 1000)
      if (new Date() < unlockTime) {
        redirect(`/dashboard?error=time_locked`)
      }
    }
  }

  // Get or create progress for this day
  let progress = progressMap.get(dayNumber)
  
  if (!progress) {
    // Create new progress entry
    const { data: newProgress, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: user.id,
        day_number: dayNumber,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (!error && newProgress) {
      progress = newProgress
    }
  } else if (!progress.started_at) {
    // Update started_at if not set
    await supabase
      .from('user_progress')
      .update({ started_at: new Date().toISOString() })
      .eq('id', progress.id)
  }

  // Get quiz questions for this day
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('day_number', dayNumber)
    .order('order_index')

  const dayTitle = DAY_TITLES[dayNumber] || `Day ${dayNumber}`

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2">
            ← Back to Dashboard
          </Link>
          <span className="text-sm text-gray-500">
            Day {dayNumber} of 30
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Day Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-emerald-500 font-bold">Day {dayNumber}</span>
            {progress?.quiz_passed && (
              <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-1 rounded-full">
                ✓ Completed
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold">{dayTitle}</h1>
        </div>

        {/* Day Content */}
        <div className="card mb-8">
          <DayContent dayNumber={dayNumber} />
        </div>

        {/* Quiz Section */}
        {questions && questions.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-bold mb-6">📝 Quiz Time!</h2>
            <Quiz
              dayNumber={dayNumber}
              questions={questions}
              previousPassed={progress?.quiz_passed || false}
              previousScore={progress?.quiz_score}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {dayNumber > 1 && (
            <Link href={`/days/${dayNumber - 1}`} className="btn-secondary">
              ← Day {dayNumber - 1}
            </Link>
          )}
          <div className="flex-1" />
          {dayNumber < 30 && progress?.quiz_passed && (
            <Link href={`/days/${dayNumber + 1}`} className="btn-primary">
              Day {dayNumber + 1} →
            </Link>
          )}
          {dayNumber === 30 && progress?.quiz_passed && (
            <Link href="/certificate" className="btn-primary">
              🏆 Get Certificate
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
