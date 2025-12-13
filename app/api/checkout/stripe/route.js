import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUser, jsonResponse, errorResponse } from '@/lib/api-middleware';
import { createAdminSupabase } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
});

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { promo_code, affiliate_code } = body;

    // Get price from environment or default
    const priceId = process.env.STRIPE_PRICE_ID;
    
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
        promo_code: promo_code || ''
      }
    };

    // Apply promo code if provided
    if (promo_code) {
      const supabase = createAdminSupabase();
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promo_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo && promo.discount_percent) {
        // Create a Stripe coupon for this discount
        const coupon = await stripe.coupons.create({
          percent_off: promo.discount_percent,
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
