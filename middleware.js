import { NextResponse } from 'next/server';

/**
 * Middleware to redirect non-www to www while preserving query strings.
 * This ensures affiliate tracking parameters (e.g., ?ref=ID) are not lost.
 */
export function middleware(request) {
  const host = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Redirect non-www to www (preserve full URL including query params)
  if (host === 'marketwarrior.club') {
    const newUrl = new URL(url.pathname + url.search, 'https://www.marketwarrior.club');
    return NextResponse.redirect(newUrl, 301);
  }

  return NextResponse.next();
}

// Run middleware on all routes
export const config = {
  matcher: '/:path*',
};
