/**
 * Stripe Checkout API - SECURE VERSION
 * Route: /api/checkout/stripe
 * 
 * Security Features:
 * - Uses Stripe Price ID instead of dynamic amount
 * - Uses Stripe's native promotion codes
 * - No custom promo code validation (let Stripe handle it)
 */

const Stripe = require('stripe');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // CRITICAL: Require Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('CRITICAL: STRIPE_SECRET_KEY not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const { email, referralCode } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Get or create Stripe customer
        let customer;
        const existingCustomers = await stripe.customers.list({ 
            email: email.toLowerCase(), 
            limit: 1 
        });
        
        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
        } else {
            customer = await stripe.customers.create({ 
                email: email.toLowerCase() 
            });
        }

        // Determine base URL
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : (req.headers.origin || 'https://marketwarriorproject.vercel.app');

        // Get Stripe Price ID from environment (or use default)
        // This should be set in Vercel environment variables
        const priceId = process.env.STRIPE_PRICE_ID;

        // Build checkout session config
        const sessionConfig = {
            customer: customer.id,
            payment_method_types: ['card'],
            mode: 'payment',
            allow_promotion_codes: true,  // Let customers enter Stripe promo codes
            success_url: `${baseUrl}/welcome.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/login.html?canceled=true`,
            customer_update: {
                address: 'auto'  // Auto-collect billing address
            },
            metadata: {
                email: email.toLowerCase(),
                referralCode: referralCode || ''
            }
        };

        // Use Price ID if available (preferred), otherwise use price_data
        if (priceId) {
            sessionConfig.line_items = [{
                price: priceId,
                quantity: 1
            }];
        } else {
            // Fallback to price_data (less secure but works)
            sessionConfig.line_items = [{
                price_data: {
                    currency: 'usd',
                    unit_amount: 3999,  // $39.99
                    product_data: {
                        name: 'Market Warrior 30-Day Trading Challenge',
                        description: 'Full course access - Transform from beginner to confident trader'
                    }
                },
                quantity: 1
            }];
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create(sessionConfig);

        return res.status(200).json({ 
            url: session.url,
            sessionId: session.id 
        });

    } catch (error) {
        console.error('Checkout error:', error);
        return res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
