/**
 * Stripe Checkout API
 * Creates a checkout session with promo code input on Stripe's checkout page
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

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

  // Check Stripe key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://gvpaemdpmwyncdztlczy.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cGFlbWRwbXd5bmNkenRsY3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MzQxNzUsImV4cCI6MjA0OTAxMDE3NX0.yrXU7tPwBSKnFP2NiT8uBzPdlmWNJMrhGv-PnE0PsKU'
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
    
    // Determine URLs
    const siteUrl = process.env.SITE_URL || 'https://marketwarriorproject.vercel.app';
    
    // Create Stripe checkout session with promo code input ENABLED
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Market Warrior 30-Day Trading Challenge',
            description: 'Complete trading education - 30 days of lessons, quizzes, and certificate',
            images: [`${siteUrl}/logo.png`]
          },
          unit_amount: 3999,  // $39.99
        },
        quantity: 1,
      }],
      mode: 'payment',
      allow_promotion_codes: true,  // ← PROMO CODE INPUT ON CHECKOUT PAGE
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/login?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        user_email: user.email
      }
    });
    
    return res.status(200).json({ url: session.url });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Checkout failed. Please try again.' });
  }
};
