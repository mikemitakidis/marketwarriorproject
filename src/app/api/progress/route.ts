import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate max unlocked day based on time
    const start = new Date(user.challenge_start_date).getTime()
    const daysPassed = Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000))
    const maxUnlockedDay = Math.min(daysPassed + 1, 30)

    return NextResponse.json({
      full_name: user.full_name,
      email: session.user.email,
      has_paid: user.has_paid,
      challenge_start_date: user.challenge_start_date,
      current_day: user.current_day || 1,
      completed_days: user.completed_days || [],
      quiz_scores: user.quiz_scores || {},
      task_submissions: user.task_submissions || {},
      max_unlocked_day: maxUnlockedDay,
      access_expires_at: user.access_expires_at
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
