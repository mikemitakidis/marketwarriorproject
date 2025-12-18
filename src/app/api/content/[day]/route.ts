import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import path from 'path'

interface RouteParams {
  params: Promise<{ day: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { day } = await params
    const dayNumber = parseInt(day)

    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
      return NextResponse.json({ error: 'Invalid day number' }, { status: 400 })
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check payment status
    const { data: profile } = await supabase
      .from('users')
      .select('has_paid')
      .eq('id', user.id)
      .single()

    if (!profile?.has_paid) {
      return NextResponse.json({ error: 'Payment required' }, { status: 403 })
    }

    // Try to load content from file
    try {
      // Try various file naming patterns
      const patterns = [
        `day${dayNumber}.html`,
        `day${dayNumber}_*.html`,
      ]

      let content = ''
      const contentDir = path.join(process.cwd(), 'src/content/days')

      // Try exact match first
      try {
        const filePath = path.join(contentDir, `day${dayNumber}.html`)
        content = await readFile(filePath, 'utf-8')
      } catch {
        // Try to find file with prefix
        const fs = await import('fs/promises')
        const files = await fs.readdir(contentDir)
        const matchingFile = files.find(f => f.startsWith(`day${dayNumber}`) && f.endsWith('.html'))
        
        if (matchingFile) {
          const filePath = path.join(contentDir, matchingFile)
          content = await readFile(filePath, 'utf-8')
        }
      }

      if (content) {
        // Strip quiz section if present (we handle quizzes separately)
        content = content.replace(/<div[^>]*class="[^"]*quiz[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        
        return NextResponse.json({ content })
      }
    } catch (err) {
      console.error('Error loading content file:', err)
    }

    // Fallback content if no file found
    const fallbackContent = `
      <h1>Day ${dayNumber}</h1>
      <p>Content for Day ${dayNumber} is being prepared. Please check back soon!</p>
    `

    return NextResponse.json({ content: fallbackContent })
  } catch (error) {
    console.error('Content API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
