import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey } from '@/lib/env';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
  const signature = req.headers.get('stripe-signature');

  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  // Service role client (bypasses RLS)
  const serviceKey = getServiceRoleKey();
  if (!serviceKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_KEY' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Idempotency: store event id
  const { data: already } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (already?.id) return NextResponse.json({ received: true });

  await supabase.from('stripe_events').insert({ id: event.id });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id || (session.metadata?.user_id ?? null);
    if (userId) {
      // Mark paid
      await supabase
        .from('user_profiles')
        .update({ has_paid: true, paid_at: new Date().toISOString() })
        .eq('user_id', userId);

      // Referral commission snapshot (if referral code exists)
      const referredByCode = session.metadata?.referred_by_code?.trim();
      if (referredByCode) {
        const { data: affiliate } = await supabase
          .from('affiliate_profiles')
          .select('user_id, referral_code, mode, active')
          .eq('referral_code', referredByCode)
          .maybeSingle();

        if (affiliate?.active) {
          // Read current settings
          const { data: settings } = await supabase
            .from('affiliate_settings')
            .select('paid_member_rate, affiliate_only_rate')
            .eq('id', 1)
            .single();

          const rate = affiliate.mode === 'paid_member' ? settings?.paid_member_rate : settings?.affiliate_only_rate;
          const amountTotal = session.amount_total ?? 0;
          const commission = Math.round(amountTotal * Number(rate ?? 0));

          await supabase.from('affiliate_commissions').insert({
            affiliate_user_id: affiliate.user_id,
            referred_user_id: userId,
            stripe_checkout_session_id: session.id,
            amount_cents: amountTotal,
            currency: session.currency ?? (process.env.STRIPE_CURRENCY ?? 'usd'),
            commission_rate: rate ?? 0,
            commission_cents: commission,
            status: 'pending',
          });
        }
      }
    }
  }

  // Refunds revoke access automatically (Option A).
  // Stripe may emit charge.refunded (selected in your webhook settings).
  if (event.type === 'charge.refunded' || event.type === 'charge.refund.updated') {
    const charge = event.data.object as Stripe.Charge;

    // Try to resolve user_id from charge metadata first...
    let userId: string | null = (charge.metadata?.user_id as string | undefined) ?? null;

    // Fallback: retrieve PaymentIntent metadata.
    if (!userId && charge.payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(
          typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id
        );
        userId = (pi.metadata?.user_id as string | undefined) ?? null;
      } catch {
        // ignore
      }
    }

    if (userId) {
      // Revoke paid access
      await supabase
        .from('user_profiles')
        .update({ has_paid: false, paid_at: null })
        .eq('user_id', userId);

      // Downgrade affiliate mode if they were a paid member
      await supabase
        .from('affiliate_profiles')
        .update({ mode: 'affiliate_only', active: true })
        .eq('user_id', userId)
        .eq('mode', 'paid_member');

      // Void non-paid commissions that were attributed to this purchase/user.
      await supabase
        .from('affiliate_commissions')
        .update({ status: 'void' })
        .eq('referred_user_id', userId)
        .neq('status', 'paid');
    }
  }

  return NextResponse.json({ received: true });
}
