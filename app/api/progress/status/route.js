import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
    const { data: progress } = await supabase.from('challenge_progress').select('*').eq('user_id', user.id);

    return NextResponse.json({ profile, progress });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
