import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminSupabase } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }

    const supabase = createAdminSupabase();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleSuccessfulPayment(supabase, session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Webhook error', { status: 500 });
  }
}

async function handleSuccessfulPayment(supabase, session) {
  const { user_id, user_email, affiliate_code, promo_code } = session.metadata || {};
  const email = user_email || session.customer_details?.email;

  if (!email) {
    console.error('No email found in session');
    return;
  }

  // Calculate access expiry (120 days)
  const accessExpiresAt = new Date();
  accessExpiresAt.setDate(accessExpiresAt.getDate() + 120);

  // Update user profile
  const updateData = {
    is_paid: true,
    challenge_start_date: new Date().toISOString(),
    access_expires_at: accessExpiresAt.toISOString(),
    stripe_customer_id: session.customer
  };

  if (user_id) {
    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user_id);

    // Initialize Day 1 progress
    await supabase.from('challenge_progress').upsert({
      user_id: user_id,
      day_number: 1,
      unlocked_at: new Date().toISOString()
    }, { onConflict: 'user_id,day_number' });
  } else {
    // Find user by email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profile) {
      await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', profile.id);

      await supabase.from('challenge_progress').upsert({
        user_id: profile.id,
        day_number: 1,
        unlocked_at: new Date().toISOString()
      }, { onConflict: 'user_id,day_number' });
    }
  }

  // Record payment
  await supabase.from('payments').insert({
    user_id: user_id || null,
    email: email,
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || 'usd',
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent,
    promo_code: promo_code || null,
    affiliate_code: affiliate_code || null,
    status: 'completed'
  });

  // Handle affiliate commission
  if (affiliate_code) {
    await processAffiliateCommission(supabase, affiliate_code, session);
  }

  // Update promo code usage
  if (promo_code) {
    await supabase.rpc('increment', { 
      table_name: 'promo_codes',
      column_name: 'current_uses',
      row_id: promo_code 
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabase
        .from('promo_codes')
        .update({ current_uses: supabase.raw('current_uses + 1') })
        .eq('code', promo_code);
    });
  }

  console.log(`Payment completed for ${email}`);
}

async function processAffiliateCommission(supabase, affiliateCode, session) {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, user_id, commission_rate')
    .eq('affiliate_code', affiliateCode)
    .eq('is_active', true)
    .single();

  if (!affiliate) return;

  const amount = (session.amount_total || 0) / 100;
  const commissionRate = affiliate.commission_rate || 0.30;
  const commission = amount * commissionRate;

  // Create referral record
  await supabase.from('referrals').insert({
    referrer_user_id: affiliate.user_id,
    referred_email: session.customer_details?.email,
    commission_earned: commission,
    commission_rate: commissionRate,
    status: 'converted',
    stripe_session_id: session.id
  });

  // Update affiliate totals
  await supabase
    .from('affiliates')
    .update({
      total_referrals: supabase.raw('total_referrals + 1'),
      total_earnings: supabase.raw(`total_earnings + ${commission}`),
      pending_earnings: supabase.raw(`pending_earnings + ${commission}`)
    })
    .eq('id', affiliate.id);

  console.log(`Affiliate ${affiliateCode} earned $${commission.toFixed(2)}`);
}
