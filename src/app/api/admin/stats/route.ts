import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = await createServiceClient()

    // Get stats
    const { count: totalUsers } = await serviceClient
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: paidUsers } = await serviceClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('has_paid', true)

    const { data: completedUsers } = await serviceClient
      .from('users')
      .select('completed_days')
      .not('completed_days', 'is', null)

    const completions = completedUsers?.filter(u => 
      u.completed_days && u.completed_days.length >= 30
    ).length || 0

    const revenue = (paidUsers || 0) * 39.99

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      paidUsers: paidUsers || 0,
      completions,
      revenue
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
