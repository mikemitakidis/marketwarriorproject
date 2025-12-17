import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/env';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Ensure profile exists and user is confirmed
  const emailConfirmedAt = (user as any).email_confirmed_at ?? (user as any).confirmed_at ?? null;
  if (!emailConfirmedAt) return NextResponse.json({ error: 'Email not confirmed' }, { status: 403 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

  const priceId = process.env.STRIPE_PRICE_ID!;
  const siteUrl = getSiteUrl();

  // Pull referral from profile (set from metadata in trigger)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('referred_by_code')
    .eq('user_id', user.id)
    .maybeSingle();

  const referredBy = profile?.referred_by_code ?? null;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    // After payment, user must complete Welcome before seeing Dashboard.
    success_url: `${siteUrl}/welcome?paid=1`,
    cancel_url: `${siteUrl}/pay?canceled=1`,
    client_reference_id: user.id,
    // Ensure refunds can be mapped back to the user via PaymentIntent metadata.
    payment_intent_data: {
      metadata: {
        user_id: user.id,
        referred_by_code: referredBy ?? '',
      },
    },
    metadata: {
      user_id: user.id,
      referred_by_code: referredBy ?? '',
    },
  });

  return NextResponse.json({ url: session.url });
}
