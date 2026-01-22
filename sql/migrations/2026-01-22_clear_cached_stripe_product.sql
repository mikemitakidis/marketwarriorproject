-- Clear cached Stripe product ID
-- This forces the system to re-discover the correct "Market Warrior 30-Day Trading Challenge" product
-- Run this if the wrong product is being used

DELETE FROM public.app_settings
WHERE key = 'stripe_product_id';

-- Verify deletion
SELECT key, value FROM public.app_settings WHERE key = 'stripe_product_id';
-- Should return 0 rows
