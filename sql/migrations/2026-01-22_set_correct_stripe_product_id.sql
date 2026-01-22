-- Fix: Set correct Stripe product ID for "Market Warrior 30-Day Trading Challenge"
-- Product ID: prod_TWtuQ72mY4csdx

-- Step 1: Clear old cached product ID
DELETE FROM public.app_settings WHERE key = 'stripe_product_id';

-- Step 2: Save the correct product ID
INSERT INTO public.app_settings (key, value)
VALUES ('stripe_product_id', 'prod_TWtuQ72mY4csdx')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Verify the change
SELECT key, value FROM public.app_settings WHERE key = 'stripe_product_id';
-- Should return: stripe_product_id | prod_TWtuQ72mY4csdx
