// Stripe Checkout API
// Route: /api/checkout/stripe

import Stripe from 'stripe';
import type {
  VercelRequest,
  VercelResponse,
  CheckoutRequestBody,
  ValidPromoCodesMap,
  CheckoutSuccessResponse,
  CheckoutErrorResponse,
} from '../../types';

const VALID_PROMO_CODES: ValidPromoCodesMap = {
  'WARRIOR10': 10,
  'LAUNCH20': 20,
  'EARLY25': 25,
  'VIP30': 30,
  'FRIEND15': 15,
};

const BASE_PRICE_CENTS = 3999; // $39.99 USD
const SITE_URL = process.env.SITE_URL || 'https://marketwarriorproject.vercel.app';

interface StripeSessionMetadata {
  [key: string]: string;
  email: string;
  promoCode: string;
  referralCode: string;
  discountPercent: string;
}

interface StripeLineItemPriceData {
  currency: string;
  product_data: {
    name: string;
    description: string;
    images: string[];
    tax_code: string;
  };
  unit_amount: number;
}

interface StripeLineItem {
  price_data: StripeLineItemPriceData;
  quantity: number;
}

interface StripeSessionParams {
  payment_method_types: ('card')[];
  line_items: StripeLineItem[];
  mode: 'payment';
  automatic_tax: { enabled: boolean };
  billing_address_collection: 'required';
  success_url: string;
  cancel_url: string;
  customer_email: string;
  metadata: StripeSessionMetadata;
  allow_promotion_codes: boolean;
}

function isValidRequestBody(body: unknown): body is CheckoutRequestBody {
  return typeof body === 'object' && body !== null;
}

function calculateDiscountedPrice(promoCode: string | undefined): {
  unitAmount: number;
  discountPercent: number;
} {
  let unitAmount = BASE_PRICE_CENTS;
  let discountPercent = 0;

  if (promoCode) {
    const upperCode = promoCode.toUpperCase();
    const discount = VALID_PROMO_CODES[upperCode];
    if (discount !== undefined) {
      discountPercent = discount;
      unitAmount = Math.round(BASE_PRICE_CENTS * (1 - discountPercent / 100));
    }
  }

  return { unitAmount, discountPercent };
}

function createProductDescription(discountPercent: number): string {
  return discountPercent > 0
    ? `${discountPercent}% discount applied! Complete trading education with lifetime certificate.`
    : 'Complete 30-day trading education program with lifetime certificate.';
}

function createSessionParams(
  email: string,
  unitAmount: number,
  discountPercent: number,
  promoCode: string | undefined,
  referralCode: string | undefined
): StripeSessionParams {
  return {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Market Warrior 30-Day Trading Challenge',
            description: createProductDescription(discountPercent),
            images: [`${SITE_URL}/logo.png`],
            tax_code: 'txcd_10103001', // Digital services/online courses
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    automatic_tax: { enabled: true },
    billing_address_collection: 'required',
    success_url: `${SITE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/?canceled=true`,
    customer_email: email,
    metadata: {
      email,
      promoCode: promoCode || '',
      referralCode: referralCode || '',
      discountPercent: discountPercent.toString(),
    },
    allow_promotion_codes: false, // We handle our own promo codes
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' });

    if (!isValidRequestBody(req.body)) {
      res.status(400).json({ error: 'Invalid request body' } as CheckoutErrorResponse);
      return;
    }

    const { email, promoCode, referralCode } = req.body as CheckoutRequestBody;

    if (!email) {
      res.status(400).json({ error: 'Email is required' } as CheckoutErrorResponse);
      return;
    }

    const { unitAmount, discountPercent } = calculateDiscountedPrice(promoCode);
    const sessionParams = createSessionParams(
      email,
      unitAmount,
      discountPercent,
      promoCode,
      referralCode
    );

    const session = await stripe.checkout.sessions.create(sessionParams);

    const response: CheckoutSuccessResponse = {
      url: session.url,
      sessionId: session.id,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stripe checkout error:', error);

    const response: CheckoutErrorResponse = {
      error: 'Failed to create checkout session',
      details: errorMessage,
    };

    res.status(500).json(response);
  }
}

module.exports = handler;
