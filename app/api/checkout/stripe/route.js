import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUser, jsonResponse, errorResponse } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
});

// Strict promo code validation (same logic as /api/promo/validate)
async function validatePromoCode(supabase, code) {
  if (!code) return { valid: false };
  
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  
  if (error || !promo) {
    return { valid: false, error: 'Promo code not found' };
  }
  
  // Check if active
  if (!promo.is_active) {
    return { valid: false, error: 'Promo code is no longer active' };
  }
  
  // Check expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Promo code has expired' };
  }
  
  // Check max uses
  if (promo.max_uses && promo.current_uses >= promo.max_uses) {
    return { valid: false, error: 'Promo code has reached maximum uses' };
  }
  
  return { 
    valid: true, 
    promo,
    discount_percent: promo.discount_percent,
    discount_amount: promo.discount_amount
  };
}

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createAdminSupabase();
    const body = await request.json();
    const { promo_code, affiliate_code } = body;

    // Get price from environment or default
    const priceId = process.env.STRIPE_PRICE_ID;
    
    if (!priceId) {
      return errorResponse('Payment not configured. Please contact support.', 500);
    }
    
    // Build checkout session params
    const sessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        affiliate_code: affiliate_code || '',
        promo_code: promo_code || '',
        expected_price_id: priceId // Store for webhook validation
      }
    };

    // Apply promo code if provided - with STRICT validation
    if (promo_code) {
      const promoValidation = await validatePromoCode(supabase, promo_code);
      
      if (!promoValidation.valid) {
        return errorResponse(promoValidation.error || 'Invalid promo code', 400);
      }
      
      const promo = promoValidation.promo;
      
      if (promo.discount_percent) {
        // Create a Stripe coupon for percentage discount
        const coupon = await stripe.coupons.create({
          percent_off: promo.discount_percent,
          duration: 'once',
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
      } else if (promo.discount_amount) {
        // Create a Stripe coupon for fixed amount discount
        const coupon = await stripe.coupons.create({
          amount_off: Math.round(promo.discount_amount * 100), // Convert to cents
          currency: 'usd',
          duration: 'once',
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return errorResponse(error.message || 'Checkout failed', 500);
  }
}
