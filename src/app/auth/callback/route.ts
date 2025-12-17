import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createSupabaseServerClient();
    // Exchange code for session (sets cookies)
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Always land in dashboard; dashboard will gate to /pay or /welcome when needed.
  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
