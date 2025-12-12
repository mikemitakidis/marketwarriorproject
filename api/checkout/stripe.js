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
        const { email, promoCode, userId } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Base price in cents ($39.99 = 3999 cents)
        let finalAmount = 3999;
        let discountPercent = 0;

        // Validate promo code if provided
        if (promoCode) {
            const { createClient } = require('@supabase/supabase-js');
            
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
                console.error('Supabase credentials not set');
            } else {
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_KEY
                );

                const { data: promo } = await supabase
                    .from('promo_codes')
                    .select('*')
                    .eq('code', promoCode.toUpperCase())
                    .eq('is_active', true)
                    .single();

                if (promo) {
                    // Check usage limit
                    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
                        return res.status(400).json({ error: 'Promo code usage limit reached' });
                    }
                    // Check expiration
                    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                        return res.status(400).json({ error: 'Promo code has expired' });
                    }
                    
                    discountPercent = promo.discount_percent;
                    finalAmount = Math.round(3999 * (1 - discountPercent / 100));
                }
            }
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
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : (req.headers.origin || 'https://marketwarriorproject.vercel.app');

        // Create checkout session
        const sessionParams = {
            customer: customer.id,
            payment_method_types: ['card'],
            mode: 'payment',
            success_url: `${baseUrl}/welcome.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/login.html?canceled=true`,
            metadata: {
                userId: userId || '',
                email: email,
                promoCode: promoCode || '',
                discountPercent: discountPercent.toString()
            },
            line_items: [{
                price_data: {
                    currency: 'usd',
                    unit_amount: finalAmount,
                    product_data: {
                        name: 'Market Warrior 30-Day Trading Challenge',
                        description: discountPercent > 0 
                            ? `Full course access (${discountPercent}% discount applied)`
                            : 'Full course access - Transform from beginner to confident trader'
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
