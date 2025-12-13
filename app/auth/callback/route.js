import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      // Check if user profile exists and their status
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_paid, agreed_to_terms')
        .eq('id', data.user.id)
        .single();
      
      if (!profile) {
        // Create user profile if doesn't exist
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || null
        });
        return NextResponse.redirect(`${origin}/checkout`);
      }
      
      if (!profile.is_paid) {
        return NextResponse.redirect(`${origin}/checkout`);
      }
      
      if (!profile.agreed_to_terms) {
        return NextResponse.redirect(`${origin}/welcome`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to home on error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
