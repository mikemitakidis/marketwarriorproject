// Stripe Webhook Handler
// Route: /api/webhooks/stripe

import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage } from 'http';
import type {
  VercelRequest,
  VercelResponse,
  ApiConfig,
  User,
  UserUpdate,
  UserInsert,
  Referrer,
  ReferralInsert,
  PaymentInsert,
  WebhookSuccessResponse,
  WebhookErrorResponse,
} from '../../types';

// Disable body parsing - Stripe needs raw body
export const config: ApiConfig = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvpaendpmwyncdztlczy.supabase.co';
const ACCESS_EXPIRY_DAYS = 120;
const PURCHASER_COMMISSION_RATE = 0.30;
const FREE_AFFILIATE_COMMISSION_RATE = 0.25;

// Types for Stripe webhook events
interface CheckoutSessionMetadata {
  email?: string;
  referralCode?: string;
  promoCode?: string;
}

interface StripeCheckoutSessionObject {
  id: string;
  customer_email?: string | null;
  customer?: string | null;
  amount_total?: number | null;
  metadata?: CheckoutSessionMetadata | null;
}

interface StripeChargeObject {
  id: string;
  customer?: string | null;
}

interface StripeEventData {
  object: StripeCheckoutSessionObject | StripeChargeObject;
}

interface StripeEvent {
  id: string;
  type: string;
  data: StripeEventData;
}

// Helper to get raw body
async function getRawBody(req: IncomingMessage): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += chunk.toString();
    });
    req.on('end', () => resolve(data));
    req.on('error', (err: Error) => reject(err));
  });
}

function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) {
    throw new Error('Supabase service key not configured');
  }
  return key;
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe secret key not configured');
  }
  return key;
}

function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, getSupabaseServiceKey());
}

function generateAffiliateCode(): string {
  return 'MW' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calculateAccessExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + ACCESS_EXPIRY_DAYS);
  return expiry;
}

function calculateCommission(amountPaid: number, hasPaid: boolean): {
  commission: number;
  commissionRate: number;
} {
  const rate = hasPaid ? PURCHASER_COMMISSION_RATE : FREE_AFFILIATE_COMMISSION_RATE;
  const commission = Math.round(amountPaid * rate * 100) / 100;
  return { commission, commissionRate: rate * 100 };
}

async function handleCheckoutSessionCompleted(
  session: StripeCheckoutSessionObject,
  supabase: SupabaseClient
): Promise<void> {
  const email = session.customer_email || session.metadata?.email;
  const referralCode = session.metadata?.referralCode;
  const promoCode = session.metadata?.promoCode;
  const amountPaid = (session.amount_total ?? 0) / 100;

  if (!email) {
    console.error('No email found in session');
    return;
  }

  const accessExpiry = calculateAccessExpiry();
  const affiliateCode = generateAffiliateCode();

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single() as { data: Pick<User, 'id'> | null };

  if (existingUser) {
    // Update existing user
    const updateData: UserUpdate = {
      has_paid: true,
      stripe_session_id: session.id,
      stripe_customer_id: session.customer,
      amount_paid: amountPaid,
      promo_code_used: promoCode || null,
      referred_by: referralCode || null,
      access_expires_at: accessExpiry.toISOString(),
      payment_date: new Date().toISOString(),
    };

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', existingUser.id);
  } else {
    // Create new user record
    const insertData: UserInsert = {
      email,
      has_paid: true,
      stripe_session_id: session.id,
      stripe_customer_id: session.customer,
      amount_paid: amountPaid,
      promo_code_used: promoCode || null,
      referred_by: referralCode || null,
      affiliate_code: affiliateCode,
      access_expires_at: accessExpiry.toISOString(),
      payment_date: new Date().toISOString(),
    };

    await supabase.from('users').insert(insertData);
  }

  // Handle referral commission
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('users')
      .select('id, affiliate_code, has_paid')
      .eq('affiliate_code', referralCode)
      .single() as { data: Referrer | null };

    if (referrer) {
      const { commission, commissionRate } = calculateCommission(
        amountPaid,
        referrer.has_paid
      );

      const referralData: ReferralInsert = {
        referrer_id: referrer.id,
        referred_email: email,
        commission,
        commission_rate: commissionRate,
        status: 'pending',
        stripe_session_id: session.id,
      };

      await supabase.from('referrals').insert(referralData);
    }
  }

  // Record payment
  const paymentData: PaymentInsert = {
    email,
    amount: amountPaid,
    stripe_session_id: session.id,
    stripe_customer_id: session.customer,
    promo_code: promoCode || null,
    referral_code: referralCode || null,
    status: 'completed',
  };

  await supabase.from('payments').insert(paymentData);

  console.log(`Payment processed for ${email}: $${amountPaid}`);
}

async function handleChargeRefunded(
  charge: StripeChargeObject,
  supabase: SupabaseClient
): Promise<void> {
  const customerId = charge.customer;

  if (!customerId) {
    console.error('No customer ID found in charge');
    return;
  }

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single() as { data: Pick<User, 'id' | 'email'> | null };

  if (user) {
    // Revoke access
    const updateData: UserUpdate = {
      has_paid: false,
      refunded: true,
      refund_date: new Date().toISOString(),
    };

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    // Update referral status if exists
    await supabase
      .from('referrals')
      .update({ status: 'refunded' })
      .eq('referred_email', user.email);

    console.log(`Refund processed for ${user.email}`);
  }
}

function isCheckoutSession(obj: unknown): obj is StripeCheckoutSessionObject {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

function isCharge(obj: unknown): obj is StripeChargeObject {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' } as WebhookErrorResponse);
    return;
  }

  const stripe = new Stripe(getStripeSecretKey(), { apiVersion: '2022-11-15' });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabase = createSupabaseClient();

  let event: StripeEvent;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (webhookSecret && signature) {
      const constructedEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
      event = constructedEvent as unknown as StripeEvent;
    } else {
      event = JSON.parse(rawBody) as StripeEvent;
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    res.status(400).json({
      error: 'Webhook Error: ' + errorMessage,
    } as WebhookErrorResponse);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (isCheckoutSession(session)) {
          await handleCheckoutSessionCompleted(session, supabase);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (isCharge(charge)) {
          await handleChargeRefunded(charge, supabase);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true } as WebhookSuccessResponse);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook processing error:', errorMessage);
    res.status(500).json({
      error: 'Webhook processing failed',
    } as WebhookErrorResponse);
  }
}

export default handler;

module.exports = handler;
module.exports.config = config;
