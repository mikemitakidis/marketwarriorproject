import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { day, taskData } = await request.json()

    if (!day) {
      return NextResponse.json({ error: 'Missing day' }, { status: 400 })
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('task_submissions')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update task submissions
    const taskSubmissions = user.task_submissions || {}
    taskSubmissions[`day${day}`] = {
      data: taskData,
      submitted_at: new Date().toISOString()
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('users')
      .update({ task_submissions: taskSubmissions })
      .eq('id', session.user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save task' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Task for Day ${day} submitted successfully!`
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
