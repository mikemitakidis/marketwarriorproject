import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { day, score, answers } = await request.json()

    if (!day || score === undefined) {
      return NextResponse.json({ error: 'Missing day or score' }, { status: 400 })
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('quiz_scores, completed_days')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update quiz scores
    const quizScores = user.quiz_scores || {}
    quizScores[`day${day}`] = score

    // If passed (60%+), add to completed days
    let completedDays = user.completed_days || []
    if (score >= 60 && !completedDays.includes(day)) {
      completedDays = [...completedDays, day].sort((a, b) => a - b)
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        quiz_scores: quizScores,
        completed_days: completedDays,
        current_day: Math.max(...completedDays, 1)
      })
      .eq('id', session.user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 })
    }

    const passed = score >= 60

    return NextResponse.json({
      success: true,
      score,
      passed,
      message: passed 
        ? `Congratulations! You passed with ${score}%. Day ${day + 1} is now unlocked!`
        : `You scored ${score}%. You need 60% to pass. Try again!`
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
