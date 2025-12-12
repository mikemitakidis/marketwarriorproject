/**
 * Stripe Checkout API
 * Creates a checkout session with proper pricing and promo codes
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Pricing
const BASE_PRICE = 3333; // $33.33 in cents
const VAT_RATE = 0.20; // 20% VAT
const VAT_AMOUNT = Math.round(BASE_PRICE * VAT_RATE); // 667 cents
const TOTAL_PRICE = BASE_PRICE + VAT_AMOUNT; // 3999 cents = $39.99

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!userData) {
      return res.status(400).json({ error: 'User profile not found. Please complete signup.' });
    }
    
    // Check if already paid
    if (userData.payment_status === 'paid') {
      return res.status(400).json({ error: 'Already purchased', redirect: '/dashboard' });
    }
    
    const { promo_code } = req.body;
    let finalPrice = TOTAL_PRICE;
    let discountPercent = 0;
    let affiliateId = null;
    
    // Validate promo code if provided
    if (promo_code) {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { data: promoData } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promo_code.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (promoData) {
        // Check usage limit
        if (!promoData.max_uses || promoData.uses_count < promoData.max_uses) {
          // Check expiry
          if (!promoData.expires_at || new Date(promoData.expires_at) > new Date()) {
            discountPercent = promoData.discount_percent || 0;
            finalPrice = Math.round(TOTAL_PRICE * (1 - discountPercent / 100));
            affiliateId = promoData.affiliate_id;
          }
        }
      }
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Market Warrior 30-Day Trading Challenge',
            description: discountPercent > 0 
              ? `Complete trading education (${discountPercent}% discount applied)`
              : 'Complete trading education course',
            images: ['https://marketwarriorproject.vercel.app/logo.jpg']
          },
          unit_amount: finalPrice,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.SITE_URL || 'https://marketwarriorproject.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'https://marketwarriorproject.vercel.app'}/?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        promo_code: promo_code || '',
        affiliate_id: affiliateId || '',
        discount_percent: discountPercent.toString(),
        original_price: TOTAL_PRICE.toString(),
        final_price: finalPrice.toString()
      }
    });
    
    return res.status(200).json({ url: session.url });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Checkout failed. Please try again.' });
  }
};
