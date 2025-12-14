import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketwarriorproject.vercel.app';

  if (code) {
    try {
      // Exchange code for session
      const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) throw error;

      if (user) {
        // Ensure profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('user_profiles').insert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            has_paid: false,
            is_admin: false,
            created_at: new Date().toISOString()
          });
        }
      }

      return NextResponse.redirect(`${baseUrl}/checkout`);
    } catch (error) {
      console.error('Callback error:', error);
      return NextResponse.redirect(`${baseUrl}/login?error=auth_failed`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login`);
}
