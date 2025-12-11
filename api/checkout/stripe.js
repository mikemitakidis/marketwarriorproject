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
        
        const { email, promoCode, referralCode } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Base price in cents ($39.99 USD)
        let unitAmount = 3999; // $39.99 in cents
        let discountPercent = 0;
        
        // Validate promo code if provided
        if (promoCode) {
            const validPromoCodes = {
                'WARRIOR10': 10,
                'LAUNCH20': 20,
                'EARLY25': 25,
                'VIP30': 30,
                'FRIEND15': 15
            };
            
            if (validPromoCodes[promoCode.toUpperCase()]) {
                discountPercent = validPromoCodes[promoCode.toUpperCase()];
                unitAmount = Math.round(3999 * (1 - discountPercent / 100));
            }
        }
        
        // Create checkout session
        const sessionParams = {
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd', // USD pricing
                    product_data: {
                        name: 'Market Warrior 30-Day Trading Challenge',
                        description: discountPercent > 0 
                            ? `${discountPercent}% discount applied! Complete trading education with lifetime certificate.`
                            : 'Complete 30-day trading education program with lifetime certificate.',
                        images: ['https://marketwarriorproject.vercel.app/logo.png']
                    },
                    unit_amount: unitAmount // Price in cents - this is the FINAL price
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${process.env.SITE_URL || 'https://marketwarriorproject.vercel.app'}/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.SITE_URL || 'https://marketwarriorproject.vercel.app'}/?canceled=true`,
            customer_email: email,
            metadata: {
                email: email,
                promoCode: promoCode || '',
                referralCode: referralCode || '',
                discountPercent: discountPercent.toString()
            },
            allow_promotion_codes: false // We handle our own promo codes
        };
        
        const session = await stripe.checkout.sessions.create(sessionParams);
        
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
