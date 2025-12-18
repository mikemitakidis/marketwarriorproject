import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_email || session.metadata?.email

    if (email) {
      const supabase = await createServiceClient()

      // Update user as paid
      const { error } = await supabase
        .from('users')
        .update({
          has_paid: true,
          payment_date: new Date().toISOString(),
          stripe_customer_id: session.customer as string,
          stripe_payment_id: session.payment_intent as string,
          access_expires_at: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('email', email)

      if (error) {
        console.error('Error updating user payment status:', error)
      }

      // Handle referral commission if applicable
      const referralCode = session.metadata?.referralCode
      if (referralCode) {
        // Find referrer and credit commission
        const { data: referrer } = await supabase
          .from('users')
          .select('id, affiliate_earnings')
          .eq('referral_code', referralCode)
          .single()

        if (referrer) {
          const commission = 12 // $12 for course members (30%)
          await supabase
            .from('users')
            .update({
              affiliate_earnings: (referrer.affiliate_earnings || 0) + commission
            })
            .eq('id', referrer.id)

          // Log the referral
          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_email: email,
            commission_amount: commission,
            status: 'pending'
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
