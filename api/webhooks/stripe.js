/**
 * Stripe Webhook Handler
 * Processes successful payments and updates user access
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Disable body parsing - Stripe needs raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        const userId = session.metadata?.user_id || session.client_reference_id;
        const userEmail = session.metadata?.user_email || session.customer_email;
        const promoCode = session.metadata?.promo_code;
        const affiliateId = session.metadata?.affiliate_id;
        const amountPaid = session.amount_total;
        
        if (!userId) {
          console.error('No user ID in session');
          return res.status(400).json({ error: 'No user ID' });
        }
        
        // Update user payment status
        const { error: userError } = await supabase
          .from('users')
          .update({
            payment_status: 'paid',
            stripe_customer_id: session.customer,
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
            challenge_start_date: new Date().toISOString(),
            amount_paid: amountPaid
          })
          .eq('id', userId);
        
        if (userError) {
          console.error('Failed to update user:', userError);
        }
        
        // Record payment
        await supabase.from('payments').insert({
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount: amountPaid,
          currency: session.currency,
          status: 'completed',
          promo_code: promoCode || null,
          affiliate_id: affiliateId || null
        });
        
        // Update promo code usage
        if (promoCode) {
          await supabase.rpc('increment_promo_usage', { promo_code: promoCode });
        }
        
        // Process affiliate commission
        if (affiliateId) {
          const commissionRate = 0.20; // 20% commission
          const commission = Math.round(amountPaid * commissionRate);
          
          await supabase.from('referral_transactions').insert({
            affiliate_id: affiliateId,
            referred_user_id: userId,
            payment_id: session.payment_intent,
            amount: amountPaid,
            commission: commission,
            status: 'pending'
          });
          
          // Update affiliate stats
          await supabase.rpc('update_affiliate_stats', {
            aff_id: affiliateId,
            new_commission: commission
          });
        }
        
        // Log activity
        await supabase.from('activity_log').insert({
          user_id: userId,
          action: 'payment_completed',
          details: JSON.stringify({
            amount: amountPaid,
            promo_code: promoCode,
            session_id: session.id
          })
        });
        
        console.log(`Payment completed for user ${userId}`);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }
    }
    
    return res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
