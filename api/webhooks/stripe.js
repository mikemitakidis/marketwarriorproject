// Stripe Webhook Handler
// Route: /api/webhooks/stripe

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Disable body parsing - Stripe needs raw body
module.exports.config = {
    api: {
        bodyParser: false
    }
};

// Helper to get raw body
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    const supabase = createClient(
        process.env.SUPABASE_URL || 'https://gvpaendpmwyncdztlczy.supabase.co',
        process.env.SUPABASE_SERVICE_KEY
    );
    
    let event;
    
    try {
        const rawBody = await getRawBody(req);
        const signature = req.headers['stripe-signature'];
        
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } else {
            event = JSON.parse(rawBody);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Webhook Error: ' + err.message });
    }
    
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                
                const email = session.customer_email || session.metadata?.email;
                const referralCode = session.metadata?.referralCode;
                const promoCode = session.metadata?.promoCode;
                const amountPaid = session.amount_total / 100;
                
                if (!email) {
                    console.error('No email found in session');
                    break;
                }
                
                // Calculate access expiry (120 days from now)
                const accessExpiry = new Date();
                accessExpiry.setDate(accessExpiry.getDate() + 120);
                
                // Generate affiliate code for this user
                const affiliateCode = 'MW' + Math.random().toString(36).substring(2, 8).toUpperCase();
                
                // Check if user already exists
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email)
                    .single();
                
                if (existingUser) {
                    // Update existing user
                    await supabase
                        .from('users')
                        .update({
                            has_paid: true,
                            stripe_session_id: session.id,
                            stripe_customer_id: session.customer,
                            amount_paid: amountPaid,
                            promo_code_used: promoCode || null,
                            referred_by: referralCode || null,
                            access_expires_at: accessExpiry.toISOString(),
                            payment_date: new Date().toISOString()
                        })
                        .eq('id', existingUser.id);
                } else {
                    // Create new user record
                    await supabase
                        .from('users')
                        .insert({
                            email: email,
                            has_paid: true,
                            stripe_session_id: session.id,
                            stripe_customer_id: session.customer,
                            amount_paid: amountPaid,
                            promo_code_used: promoCode || null,
                            referred_by: referralCode || null,
                            affiliate_code: affiliateCode,
                            access_expires_at: accessExpiry.toISOString(),
                            payment_date: new Date().toISOString()
                        });
                }
                
                // Handle referral commission
                if (referralCode) {
                    // Find referrer and check if they've purchased the course
                    const { data: referrer } = await supabase
                        .from('users')
                        .select('id, affiliate_code, has_paid')
                        .eq('affiliate_code', referralCode)
                        .single();
                    
                    if (referrer) {
                        // Calculate commission: 30% for purchasers, 25% for free affiliates
                        const commissionRate = referrer.has_paid ? 0.30 : 0.25;
                        const commission = Math.round(amountPaid * commissionRate * 100) / 100;
                        
                        // Create referral record
                        await supabase
                            .from('referrals')
                            .insert({
                                referrer_id: referrer.id,
                                referred_email: email,
                                commission: commission,
                                commission_rate: commissionRate * 100,
                                status: 'pending',
                                stripe_session_id: session.id
                            });
                    }
                }
                
                // Record payment
                await supabase
                    .from('payments')
                    .insert({
                        email: email,
                        amount: amountPaid,
                        stripe_session_id: session.id,
                        stripe_customer_id: session.customer,
                        promo_code: promoCode || null,
                        referral_code: referralCode || null,
                        status: 'completed'
                    });
                
                console.log(`Payment processed for ${email}: $${amountPaid}`);
                break;
            }
            
            case 'charge.refunded': {
                const charge = event.data.object;
                const customerId = charge.customer;
                
                // Find user by Stripe customer ID
                const { data: user } = await supabase
                    .from('users')
                    .select('id, email')
                    .eq('stripe_customer_id', customerId)
                    .single();
                
                if (user) {
                    // Revoke access
                    await supabase
                        .from('users')
                        .update({
                            has_paid: false,
                            refunded: true,
                            refund_date: new Date().toISOString()
                        })
                        .eq('id', user.id);
                    
                    // Update referral status if exists
                    await supabase
                        .from('referrals')
                        .update({ status: 'refunded' })
                        .eq('referred_email', user.email);
                    
                    console.log(`Refund processed for ${user.email}`);
                }
                break;
            }
            
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        
        return res.status(200).json({ received: true });
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
};
