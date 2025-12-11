// Stripe Checkout API
// Route: /api/checkout/stripe

const Stripe = require('stripe');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const { email, referralCode } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Create checkout session using Stripe Price ID
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: 'price_1SHXI8KnljudWYin6IHxo7QS', // Your Stripe Price ID
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${process.env.SITE_URL || 'https://marketwarriorproject.vercel.app'}/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.SITE_URL || 'https://marketwarriorproject.vercel.app'}/?canceled=true`,
            customer_email: email,
            allow_promotion_codes: true, // Shows promo code field on Stripe checkout
            metadata: {
                email: email,
                referralCode: referralCode || ''
            }
        });
        
        return res.status(200).json({ 
            url: session.url,
            sessionId: session.id 
        });
        
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        });
    }
};
