const Stripe = require('stripe');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY not set');
        return res.status(500).json({ error: 'Server configuration error - Stripe key missing' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const { email, userId } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Get or create Stripe customer
        let customer;
        const existingCustomers = await stripe.customers.list({ email: email, limit: 1 });
        
        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
        } else {
            customer = await stripe.customers.create({ email: email });
        }

        // Determine the success and cancel URLs
        const baseUrl = process.env.SITE_URL || 'https://marketwarriorproject.vercel.app';

        // Create checkout session with PROMO CODES ENABLED ON STRIPE CHECKOUT PAGE
        const sessionParams = {
            customer: customer.id,
            payment_method_types: ['card'],
            mode: 'payment',
            allow_promotion_codes: true,  // PROMO CODE INPUT ON STRIPE CHECKOUT PAGE
            success_url: `${baseUrl}/welcome.html?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${baseUrl}/login.html?canceled=true`,
            metadata: {
                userId: userId || '',
                email: email
            },
            line_items: [{
                price_data: {
                    currency: 'usd',
                    unit_amount: 3999,  // $39.99
                    product_data: {
                        name: 'Market Warrior 30-Day Trading Challenge',
                        description: 'Full course access - Transform from beginner to confident trader',
                        images: [`${baseUrl}/logo.png`]
                    }
                },
                quantity: 1
            }]
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

        return res.status(200).json({ 
            url: session.url,
            sessionId: session.id 
        });

    } catch (error) {
        console.error('Checkout error:', error);
        return res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        });
    }
};
