import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QUIZ_PASS_RATE } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dayNumber, answers } = await request.json()

    if (!dayNumber || !answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Get quiz questions for this day
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer')
      .eq('day_number', dayNumber)

    if (questionsError || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Questions not found' }, { status: 404 })
    }

    // Calculate score
    let correctCount = 0
    for (const question of questions) {
      if (answers[question.id] === question.correct_answer) {
        correctCount++
      }
    }

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= QUIZ_PASS_RATE * 100

    // Record the attempt
    await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        day_number: dayNumber,
        score,
        passed,
        answers
      })

    // Update user progress
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('id, quiz_attempts, quiz_passed')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .single()

    if (existingProgress) {
      // Only update if better score or not passed yet
      const updateData: Record<string, any> = {
        quiz_attempts: (existingProgress.quiz_attempts || 0) + 1,
        updated_at: new Date().toISOString()
      }

      // Update score and passed status
      if (passed || !existingProgress.quiz_passed) {
        updateData.quiz_score = score
        updateData.quiz_passed = passed

        if (passed) {
          updateData.completed_at = new Date().toISOString()
        }
      }

      await supabase
        .from('user_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
    } else {
      // Create new progress entry
      await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          day_number: dayNumber,
          started_at: new Date().toISOString(),
          quiz_score: score,
          quiz_passed: passed,
          quiz_attempts: 1,
          completed_at: passed ? new Date().toISOString() : null
        })
    }

    return NextResponse.json({
      score,
      passed,
      correctCount,
      totalQuestions: questions.length
    })
  } catch (error) {
    console.error('Quiz submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
