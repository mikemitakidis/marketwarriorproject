import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const COMMISSION_RATE = 0.30; // 30% affiliate commission

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Use service role client for webhook operations
    const supabase = await createServiceClient();

    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .single();

    if (existingEvent) {
      console.log('Duplicate event, skipping:', event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record the event
    await supabase
      .from('stripe_events')
      .insert({
        id: event.id,
        type: event.type
      });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const referredBy = session.metadata?.referred_by;

        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        // Update user to paid status and set challenge start date
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            has_paid: true,
            challenge_start_date: new Date().toISOString(),
            stripe_customer_id: session.customer as string || null
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update user paid status:', updateError);
        } else {
          console.log('User marked as paid:', userId);
        }

        // Handle affiliate commission if referred
        if (referredBy && referredBy.trim() !== '') {
          // Find affiliate by referral code
          const { data: affiliate } = await supabase
            .from('affiliate_profiles')
            .select('id, user_id, total_earnings, pending_payout, paid_conversions')
            .eq('referral_code', referredBy)
            .single();

          if (affiliate) {
            const amount = (session.amount_total || 3999) / 100; // Convert cents to dollars
            const commission = amount * COMMISSION_RATE;

            // Create commission record
            await supabase
              .from('affiliate_commissions')
              .insert({
                affiliate_user_id: affiliate.user_id,
                referred_user_id: userId,
                amount: commission,
                status: 'pending',
                stripe_payment_intent: session.payment_intent as string || null
              });

            // Update affiliate stats
            await supabase
              .from('affiliate_profiles')
              .update({
                total_earnings: (affiliate.total_earnings || 0) + commission,
                pending_payout: (affiliate.pending_payout || 0) + commission,
                paid_conversions: (affiliate.paid_conversions || 0) + 1
              })
              .eq('id', affiliate.id);

            console.log('Affiliate commission recorded:', commission, 'for affiliate:', affiliate.user_id);
          }
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
