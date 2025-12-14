import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Valid Price IDs
const VALID_PRICE_IDS = [
  process.env.STRIPE_PRICE_ID_USD,
  process.env.STRIPE_PRICE_ID_GBP
].filter(Boolean);

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const email = session.customer_email;

    // P0.4 FIX: Verify the price ID if we have valid IDs configured
    if (VALID_PRICE_IDS.length > 0) {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        
        if (priceId && !VALID_PRICE_IDS.includes(priceId)) {
          console.error('Invalid price ID:', priceId);
          return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
        }
      } catch (err) {
        console.error('Error verifying price:', err);
        // Continue anyway if we can't verify - don't block legitimate payments
      }
    }

    if (userId) {
      // P0.2 FIX: Use SERVER time for all dates
      const serverNow = new Date();
      const accessExpires = new Date(serverNow);
      accessExpires.setDate(accessExpires.getDate() + 120);

      // Update profile with payment status
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          has_paid: true,
          payment_date: serverNow.toISOString(),
          amount_paid: session.amount_total / 100,
          currency: session.currency,
          stripe_session_id: session.id,
          stripe_customer_id: session.customer,
          // Set access expiry - this will be finalized when they accept terms
          access_expires_at: accessExpires.toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Record payment
      const { error: paymentError } = await supabase.from('payments').insert({
        user_id: userId,
        email,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: 'completed',
        stripe_session_id: session.id,
        stripe_customer_id: session.customer,
        stripe_payment_intent: session.payment_intent,
        created_at: serverNow.toISOString()
      });

      if (paymentError) {
        console.error('Payment record error:', paymentError);
      }

      // Handle promo code usage
      const promoCode = session.metadata?.promo_code;
      if (promoCode) {
        const { error: promoError } = await supabase.rpc('increment_promo_usage', { 
          code_to_update: promoCode 
        });
        
        if (promoError) {
          // Fallback to direct update
          await supabase
            .from('promo_codes')
            .update({ current_uses: supabase.sql`current_uses + 1` })
            .eq('code', promoCode);
        }
      }

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'payment_completed',
        details: { amount: session.amount_total / 100, currency: session.currency },
        created_at: serverNow.toISOString()
      });
    }
  }

  return NextResponse.json({ received: true });
}
