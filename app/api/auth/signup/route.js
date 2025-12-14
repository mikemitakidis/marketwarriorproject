import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use anon key for regular signup (sends confirmation email)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { email, password, fullName, referralCode } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Sign up with Supabase Auth - this WILL send confirmation email
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          full_name: fullName,
          referred_by: referralCode || null
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please login instead.' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Check if user needs to confirm email
    if (data.user && !data.user.confirmed_at) {
      return NextResponse.json({ 
        success: true, 
        requiresConfirmation: true,
        message: 'Please check your email to confirm your account.'
      });
    }

    // If already confirmed (shouldn't happen on new signup, but handle it)
    return NextResponse.json({ 
      success: true,
      requiresConfirmation: false,
      message: 'Account created successfully.'
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Server error during signup' }, { status: 500 });
  }
}
