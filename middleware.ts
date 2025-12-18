import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/days', '/community', '/journal', '/affiliate', '/certificate', '/welcome']

// Routes that require payment
const paidRoutes = ['/days', '/community', '/journal', '/certificate']

// Admin only routes
const adminRoutes = ['/admin']

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPaidRoute = paidRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  // Redirect to login if not authenticated on protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check payment status for paid routes
  if (isPaidRoute && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('has_paid')
      .eq('id', user.id)
      .single()

    if (!profile?.has_paid) {
      return NextResponse.redirect(new URL('/pay', request.url))
    }
  }

  // Check admin status for admin routes
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
