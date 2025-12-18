import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, promoCode, referralCode } = body

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Market Warrior 30-Day Trading Challenge',
              description: '30 days of trading education, quizzes, tasks, and certificate',
            },
            unit_amount: 3999, // $39.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/welcome?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/login?canceled=true`,
      customer_email: email,
      metadata: {
        email,
        referralCode: referralCode || '',
        promoCode: promoCode || ''
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
