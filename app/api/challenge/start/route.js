import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { full_name, affiliate_code, agreements } = await request.json();

    // Validate all agreements
    if (!agreements?.agree1 || !agreements?.agree2 || !agreements?.agree3 || !agreements?.agree4 || !agreements?.agree5) {
      return NextResponse.json({ error: 'All agreements required' }, { status: 400 });
    }

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile?.has_paid) {
      return NextResponse.json({ error: 'Payment required' }, { status: 403 });
    }

    if (profile?.agreed_to_terms) {
      return NextResponse.json({ error: 'Already started' }, { status: 400 });
    }

    // P0.2 FIX: Use SERVER time for all dates
    const serverNow = new Date();
    const accessExpires = new Date(serverNow);
    accessExpires.setDate(accessExpires.getDate() + 120);

    // Update profile with SERVER timestamps
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name: full_name.trim(),
        agreed_to_terms: true,
        agreement_date: serverNow.toISOString(),
        challenge_start_date: serverNow.toISOString(),
        access_expires_at: accessExpires.toISOString(),
        affiliate_code: affiliate_code,
        current_day: 1,
        gdpr_consent: true,
        gdpr_consent_date: serverNow.toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    // Initialize Day 1 progress with SERVER time
    await supabase.from('challenge_progress').upsert({
      user_id: user.id,
      day_number: 1,
      unlocked: true,
      unlocked_at: serverNow.toISOString()
    }, { onConflict: 'user_id,day_number' });

    return NextResponse.json({ 
      success: true,
      challenge_start_date: serverNow.toISOString(),
      access_expires_at: accessExpires.toISOString()
    });

  } catch (err) {
    console.error('Challenge start error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
