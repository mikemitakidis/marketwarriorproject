import type { IncomingMessage, ServerResponse } from 'http';

// =============================================================================
// Vercel Serverless Types
// =============================================================================

export interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] | undefined };
  cookies: { [key: string]: string };
  body: unknown;
  headers: IncomingMessage['headers'] & {
    authorization?: string;
    'stripe-signature'?: string;
  };
}

export interface VercelResponse extends ServerResponse {
  status(statusCode: number): VercelResponse;
  json(body: unknown): void;
  send(body: string | Buffer | object): void;
  redirect(statusOrUrl: string | number, url?: string): VercelResponse;
  setHeader(name: string, value: string | number | readonly string[]): this;
}

export type VercelHandler = (
  req: VercelRequest,
  res: VercelResponse
) => void | Promise<void>;

// =============================================================================
// Promo Code Types
// =============================================================================

export interface PromoCodeData {
  discount: number;
  description: string;
}

export interface PromoCodesMap {
  [code: string]: PromoCodeData;
}

export interface PromoValidateRequestBody {
  code?: string;
}

export interface PromoValidSuccessResponse {
  valid: true;
  code: string;
  discount: number;
  description: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  currency: string;
  symbol: string;
}

export interface PromoValidFailResponse {
  valid: false;
  error: string;
}

export type PromoValidResponse = PromoValidSuccessResponse | PromoValidFailResponse;

// =============================================================================
// Checkout Types
// =============================================================================

export interface CheckoutRequestBody {
  email?: string;
  promoCode?: string;
  referralCode?: string;
}

export interface ValidPromoCodesMap {
  [code: string]: number;
}

export interface CheckoutSuccessResponse {
  url: string | null;
  sessionId: string;
}

export interface CheckoutErrorResponse {
  error: string;
  details?: string;
}

// =============================================================================
// Quiz Types
// =============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizSubmitRequestBody {
  userId?: string;
  dayNumber?: number;
  answers?: number[];
  score?: number;
  passed?: boolean;
}

export interface QuizResultRecord {
  user_id: string;
  day_number: number;
  score: number;
  passed: boolean;
  answers: number[];
  completed_at: string;
}

export interface ProgressRecord {
  user_id: string;
  day_number: number;
  quiz_passed: boolean;
  quiz_score: number;
  unlocked: boolean;
  completed?: boolean;
}

export interface QuizSubmitSuccessResponse {
  success: true;
  score: number;
  passed: boolean;
  message: string;
}

export interface QuizSubmitErrorResponse {
  error: string;
}

// =============================================================================
// Day Content Types
// =============================================================================

export interface TaskContent {
  description: string;
  steps: string[];
}

export interface DayContent {
  title: string;
  subtitle: string;
  youtube_id: string | null;
  next_preview: string;
  task: TaskContent;
  quiz: QuizQuestion[];
}

export interface DayContentMap {
  [day: number]: DayContent;
}

export interface DayContentSuccessResponse {
  success: true;
  day: number;
  content: DayContent;
  quiz: QuizQuestion[];
}

export interface DayContentErrorResponse {
  success: false;
  error: string;
}

export type DayContentResponse = DayContentSuccessResponse | DayContentErrorResponse;

// =============================================================================
// User & Database Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  has_paid: boolean;
  stripe_session_id?: string | null;
  stripe_customer_id?: string | null;
  amount_paid?: number | null;
  promo_code_used?: string | null;
  referred_by?: string | null;
  affiliate_code?: string | null;
  access_expires_at?: string | null;
  payment_date?: string | null;
  challenge_start_time?: string | null;
  refunded?: boolean;
  refund_date?: string | null;
}

export interface UserUpdate {
  has_paid?: boolean;
  stripe_session_id?: string;
  stripe_customer_id?: string | null;
  amount_paid?: number;
  promo_code_used?: string | null;
  referred_by?: string | null;
  access_expires_at?: string;
  payment_date?: string;
  refunded?: boolean;
  refund_date?: string;
}

export interface UserInsert {
  email: string;
  has_paid: boolean;
  stripe_session_id: string;
  stripe_customer_id?: string | null;
  amount_paid: number;
  promo_code_used?: string | null;
  referred_by?: string | null;
  affiliate_code: string;
  access_expires_at: string;
  payment_date: string;
}

export interface Referrer {
  id: string;
  affiliate_code: string;
  has_paid: boolean;
}

export interface ReferralInsert {
  referrer_id: string;
  referred_email: string;
  commission: number;
  commission_rate: number;
  status: 'pending' | 'paid' | 'refunded';
  stripe_session_id: string;
}

export interface PaymentInsert {
  email: string;
  amount: number;
  stripe_session_id: string;
  stripe_customer_id?: string | null;
  promo_code?: string | null;
  referral_code?: string | null;
  status: 'completed' | 'refunded' | 'pending';
}

// =============================================================================
// Stripe Webhook Types
// =============================================================================

export interface StripeCheckoutSession {
  id: string;
  customer_email?: string | null;
  customer?: string | null;
  amount_total?: number | null;
  metadata?: {
    email?: string;
    referralCode?: string;
    promoCode?: string;
    discountPercent?: string;
  } | null;
}

export interface StripeCharge {
  id: string;
  customer?: string | null;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession | StripeCharge;
  };
}

export interface WebhookSuccessResponse {
  received: true;
}

export interface WebhookErrorResponse {
  error: string;
}

// =============================================================================
// API Config Types
// =============================================================================

export interface ApiConfig {
  api: {
    bodyParser: boolean;
  };
}

// =============================================================================
// Supabase Auth Types
// =============================================================================

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  aud?: string;
  role?: string;
}

export interface SupabaseAuthResponse {
  data: {
    user: SupabaseAuthUser | null;
  };
  error: Error | null;
}

// =============================================================================
// Generic API Response Types
// =============================================================================

export interface GenericErrorResponse {
  error: string;
}

export interface MethodNotAllowedResponse {
  error: 'Method not allowed';
}
