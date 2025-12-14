import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// P0.4 FIX: Use Price ID from environment
const STRIPE_PRICE_ID_USD = process.env.STRIPE_PRICE_ID_USD;
const STRIPE_PRICE_ID_GBP = process.env.STRIPE_PRICE_ID_GBP;

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

    const { promo_code, currency = 'usd' } = await request.json();
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketwarriorproject.vercel.app';
    
    // Determine price ID based on currency
    const priceId = currency === 'gbp' ? STRIPE_PRICE_ID_GBP : STRIPE_PRICE_ID_USD;
    
    // Build line items
    let lineItems;
    let discounts = [];
    
    // Check if promo code exists and get Stripe coupon ID
    if (promo_code) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promo_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo?.stripe_coupon_id) {
        discounts = [{ coupon: promo.stripe_coupon_id }];
      }
    }

    // Use Price ID if available, otherwise fall back to price_data
    if (priceId) {
      lineItems = [{
        price: priceId,
        quantity: 1
      }];
    } else {
      // Fallback to price_data if no Price ID configured
      lineItems = [{
        price_data: {
          currency: currency,
          product_data: {
            name: 'Market Warrior 30-Day Trading Challenge',
            description: 'Full course access - 30 days of trading education'
          },
          unit_amount: currency === 'gbp' ? 3999 : 3999 // £39.99 or $39.99
        },
        quantity: 1
      }];
    }

    // Create Stripe session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        promo_code: promo_code || ''
      }
    };

    if (discounts.length > 0) {
      sessionConfig.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
