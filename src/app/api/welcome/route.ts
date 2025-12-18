import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { full_name } = await request.json()

    if (!full_name || full_name.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 })
    }

    // Update user with terms agreement and full name
    const { error } = await supabase
      .from('users')
      .update({
        full_name: full_name.trim(),
        agreed_to_terms: true,
        terms_agreed_at: new Date().toISOString(),
        challenge_start_date: new Date().toISOString()
      })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
