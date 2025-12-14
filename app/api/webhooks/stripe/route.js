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
  const { user_id, user_email, affiliate_code, promo_code, expected_price_id } = session.metadata || {};
  const email = user_email || session.customer_details?.email;

  if (!email) {
    console.error('No email found in session');
    return;
  }

  // SECURITY: Validate this is a legitimate purchase for our course
  // Expand line_items to verify the price
  const expectedPriceId = expected_price_id || process.env.STRIPE_PRICE_ID;
  
  if (expectedPriceId && session.id) {
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items']
      });
      
      const lineItems = fullSession.line_items?.data || [];
      const hasValidProduct = lineItems.some(item => 
        item.price?.id === expectedPriceId
      );
      
      if (!hasValidProduct && lineItems.length > 0) {
        console.error('SECURITY: Payment session does not contain expected product!', {
          expected: expectedPriceId,
          actual: lineItems.map(i => i.price?.id)
        });
        // Log this as suspicious but still process (might be a legacy session)
        await supabase.from('activity_log').insert({
          action: 'suspicious_payment',
          details: { 
            session_id: session.id, 
            expected_price: expectedPriceId,
            actual_prices: lineItems.map(i => i.price?.id)
          }
        });
      }
    } catch (e) {
      console.error('Could not verify line items:', e);
    }
  }

  // Find the user
  let userId = user_id;
  let existingProfile = null;
  
  if (userId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    existingProfile = profile;
  } else {
    // Find user by email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    if (profile) {
      userId = profile.id;
      existingProfile = profile;
    }
  }

  // Build update data - DO NOT reset dates if already set
  const now = new Date().toISOString();
  const updateData = {
    is_paid: true,
    stripe_customer_id: session.customer
  };
  
  // Only set challenge_start_date if not already set
  if (!existingProfile?.challenge_start_date) {
    updateData.challenge_start_date = now;
  }
  
  // Only set access_expires_at if not already set OR if expired
  const currentExpiry = existingProfile?.access_expires_at;
  const isExpired = currentExpiry && new Date(currentExpiry) < new Date();
  
  if (!currentExpiry || isExpired) {
    const accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 120);
    updateData.access_expires_at = accessExpiresAt.toISOString();
  }

  // Update user profile
  if (userId) {
    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);

    // Initialize Day 1 progress only if not exists
    await supabase.from('challenge_progress').upsert({
      user_id: userId,
      day_number: 1,
      unlocked_at: existingProfile?.challenge_start_date || now
    }, { onConflict: 'user_id,day_number' });
  }

  // Record payment
  await supabase.from('payments').insert({
    user_id: userId || null,
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
    await processAffiliateCommission(supabase, affiliate_code, session, userId);
  }

  // Increment promo code usage (only on successful payment!)
  if (promo_code) {
    // Get current promo code
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('id, current_uses')
      .eq('code', promo_code.toUpperCase())
      .single();
    
    if (promo) {
      await supabase
        .from('promo_codes')
        .update({ current_uses: (promo.current_uses || 0) + 1 })
        .eq('id', promo.id);
    }
  }

  // Log successful payment
  await supabase.from('activity_log').insert({
    user_id: userId,
    action: 'payment_completed',
    details: { 
      amount: (session.amount_total || 0) / 100,
      promo_code,
      affiliate_code
    }
  });

  console.log(`Payment completed for ${email}`);
}

async function processAffiliateCommission(supabase, affiliateCode, session, referredUserId) {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, user_id, commission_rate, total_referrals, total_earnings, pending_earnings')
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
    referred_user_id: referredUserId,
    referred_email: session.customer_details?.email,
    commission_earned: commission,
    commission_rate: commissionRate,
    status: 'converted',
    stripe_session_id: session.id
  });

  // Update affiliate totals (proper increment, not using .raw())
  await supabase
    .from('affiliates')
    .update({
      total_referrals: (affiliate.total_referrals || 0) + 1,
      total_earnings: parseFloat((affiliate.total_earnings || 0)) + commission,
      pending_earnings: parseFloat((affiliate.pending_earnings || 0)) + commission
    })
    .eq('id', affiliate.id);

  console.log(`Affiliate ${affiliateCode} earned $${commission.toFixed(2)}`);
}
