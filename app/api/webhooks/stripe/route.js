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
  const { user_id, user_email, affiliate_code } = session.metadata || {};
  const email = user_email || session.customer_details?.email;

  if (!email) {
    console.error('No email found in session');
    return;
  }

  // Find the user by user_id (auth id) or email
  let userId = user_id;
  let existingProfile = null;
  
  if (userId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    existingProfile = profile;
  }
  
  if (!existingProfile) {
    // Find user by email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    if (profile) {
      userId = profile.user_id;
      existingProfile = profile;
    }
  }

  const now = new Date().toISOString();
  const accessExpiresAt = new Date();
  accessExpiresAt.setDate(accessExpiresAt.getDate() + 120);

  // If no profile exists, we need to create one
  // This can happen if auth callback failed
  if (!existingProfile && userId) {
    console.log(`Creating profile for user ${userId} during payment`);
    
    // Generate affiliate code
    const prefix = email.split('@')[0].toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const affiliateCodeGenerated = prefix + suffix;
    
    const { error: insertError } = await supabase.from('user_profiles').insert({
      user_id: userId,
      email: email.toLowerCase(),
      has_paid: true,
      is_admin: false,
      agreed_to_terms: false,
      affiliate_code: affiliateCodeGenerated,
      referred_by: affiliate_code || null,
      stripe_customer_id: session.customer,
      payment_date: now,
      amount_paid: (session.amount_total || 0) / 100,
      stripe_session_id: session.id,
      challenge_start_date: now,
      access_expires_at: accessExpiresAt.toISOString(),
      created_at: now
    });
    
    if (insertError) {
      console.error('Failed to create profile during payment:', insertError);
    } else {
      // Initialize Day 1 progress
      await supabase.from('challenge_progress').insert({
        user_id: userId,
        day_number: 1,
        unlocked: true,
        unlocked_at: now
      });
    }
  } else if (existingProfile) {
    // Build update data - DO NOT reset dates if already set
    const updateData = {
      has_paid: true,
      stripe_customer_id: session.customer,
      payment_date: now,
      amount_paid: (session.amount_total || 0) / 100,
      stripe_session_id: session.id
    };
    
    // Only set challenge_start_date if not already set
    if (!existingProfile.challenge_start_date) {
      updateData.challenge_start_date = now;
    }
    
    // Only set access_expires_at if not already set OR if expired
    const currentExpiry = existingProfile.access_expires_at;
    const isExpired = currentExpiry && new Date(currentExpiry) < new Date();
    
    if (!currentExpiry || isExpired) {
      updateData.access_expires_at = accessExpiresAt.toISOString();
    }

    // Update user profile
    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);

    // Initialize Day 1 progress only if not exists
    const { data: existingProgress } = await supabase
      .from('challenge_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('day_number', 1)
      .single();
    
    if (!existingProgress) {
      await supabase.from('challenge_progress').insert({
        user_id: userId,
        day_number: 1,
        unlocked: true,
        unlocked_at: updateData.challenge_start_date || now
      });
    }
  }

  // Record payment
  await supabase.from('payments').insert({
    user_id: userId || null,
    email: email.toLowerCase(),
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || 'usd',
    stripe_session_id: session.id,
    stripe_customer_id: session.customer,
    stripe_payment_intent: session.payment_intent,
    referral_code: affiliate_code || null,
    status: 'completed'
  });

  // Handle affiliate commission
  if (affiliate_code) {
    await processAffiliateCommission(supabase, affiliate_code, session, email);
  }

  console.log(`Payment completed for ${email}`);
}

async function processAffiliateCommission(supabase, affiliateCode, session, referredEmail) {
  // Find the referrer by their affiliate_code in user_profiles
  const { data: referrer } = await supabase
    .from('user_profiles')
    .select('user_id, has_paid')
    .eq('affiliate_code', affiliateCode)
    .single();

  if (!referrer) {
    console.log(`Affiliate code ${affiliateCode} not found`);
    return;
  }

  const amount = (session.amount_total || 0) / 100;
  // Paid users get 30%, free affiliates get 25%
  const commissionRate = referrer.has_paid ? 0.30 : 0.25;
  const commission = amount * commissionRate;

  // Create referral record
  await supabase.from('referrals').insert({
    referrer_user_id: referrer.user_id,
    referred_email: referredEmail,
    commission: commission,
    commission_rate: commissionRate,
    status: 'pending',
    stripe_session_id: session.id
  });

  // Update referrer's totals in user_profiles
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('total_referrals, total_earnings')
    .eq('user_id', referrer.user_id)
    .single();

  await supabase
    .from('user_profiles')
    .update({
      total_referrals: (currentProfile?.total_referrals || 0) + 1,
      total_earnings: parseFloat((currentProfile?.total_earnings || 0)) + commission
    })
    .eq('user_id', referrer.user_id);

  console.log(`Affiliate ${affiliateCode} earned $${commission.toFixed(2)}`);
}
