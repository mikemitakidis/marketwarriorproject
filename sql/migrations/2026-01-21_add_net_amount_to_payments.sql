-- Migration: Add net_amount_cents to payments table
-- Date: 2026-01-21
-- Purpose: Store Stripe net amount (after fees) for accurate revenue tracking

-- Add net_amount_cents column
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS net_amount_cents int;

-- Add index for faster revenue queries
CREATE INDEX IF NOT EXISTS idx_payments_net_amount ON public.payments(net_amount_cents) WHERE net_amount_cents IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.payments.net_amount_cents IS 'Net amount received after Stripe fees (from balance_transaction)';
