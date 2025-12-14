import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Service key for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateReferralCode(email) {
  const prefix = email.split('@')[0].toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + suffix;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // Create a client with cookies for session exchange
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data?.user) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const user = data.user;

    // Check if user profile exists using admin client (bypasses RLS)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      // Create user profile - this is when they first confirm their email
      const referredBy = user.user_metadata?.referred_by || null;
      const fullName = user.user_metadata?.full_name || null;
      
      const { error: insertError } = await supabaseAdmin.from('user_profiles').insert({
        user_id: user.id,
        email: user.email.toLowerCase(),
        full_name: fullName,
        has_paid: false,
        is_admin: false,
        agreed_to_terms: false,
        affiliate_code: generateReferralCode(user.email),
        referred_by: referredBy,
        created_at: new Date().toISOString()
      });
      
      if (insertError) {
        console.error('Profile creation error:', insertError);
        // Don't fail - user is authenticated, just profile creation failed
      }

      // New user - send to checkout
      return NextResponse.redirect(`${origin}/checkout`);
    }

    // Existing user - check their status
    if (!existingProfile.has_paid) {
      return NextResponse.redirect(`${origin}/checkout`);
    }
    
    if (!existingProfile.agreed_to_terms) {
      return NextResponse.redirect(`${origin}/welcome`);
    }
    
    return NextResponse.redirect(`${origin}${next}`);
    
  } catch (err) {
    console.error('Auth callback exception:', err);
    return NextResponse.redirect(`${origin}/login?error=callback_error`);
  }
}
