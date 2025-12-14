import Stripe from 'stripe';
import { jsonResponse, errorResponse, getAuthUser } from '@/lib/api-middleware';
import { getServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    const { promo_code, affiliate_code } = await request.json();

    const supabase = getServiceClient();
    let discountPercent = 0;

    // Try to validate promo code if provided
    if (promo_code) {
      try {
        const { data: promo } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', promo_code.toUpperCase())
          .eq('active', true)
          .single();

        if (promo) {
          const validExpiry = !promo.expires_at || new Date(promo.expires_at) > new Date();
          const validUsage = !promo.max_uses || promo.uses_count < promo.max_uses;

          if (validExpiry && validUsage) {
            discountPercent = promo.discount_percent || 0;
            // Increment usage
            await supabase
              .from('promo_codes')
              .update({ uses_count: (promo.uses_count || 0) + 1 })
              .eq('id', promo.id);
          }
        }
      } catch (e) {
        // Promo codes table doesn't exist - continue without discount
        console.log('Promo codes not available');
      }
    }

    // Calculate price
    const basePrice = 4700; // $47.00 in cents
    const finalPrice = discountPercent > 0 
      ? Math.round(basePrice * (1 - discountPercent / 100))
      : basePrice;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '30-Day Market Warrior Challenge',
            description: 'Complete trading education with daily lessons, quizzes, and tasks',
          },
          unit_amount: finalPrice,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://marketwarriorproject.vercel.app'}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://marketwarriorproject.vercel.app'}/checkout`,
      metadata: {
        user_id: user?.id || '',
        user_email: user?.email || '',
        affiliate_code: affiliate_code || '',
        promo_code: promo_code || '',
      },
      customer_email: user?.email,
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return errorResponse('Failed to create checkout session', 500);
  }
}
