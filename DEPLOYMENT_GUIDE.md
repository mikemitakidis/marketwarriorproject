# Market Warrior Deployment Guide

## Step 1: Supabase Setup
1. Go to Supabase SQL Editor
2. Run the complete-setup.sql file
3. Copy your project URL and keys

## Step 2: Stripe Setup
1. Create product in Stripe Dashboard
2. Create price for USD ($39.99)
3. Create price for GBP (£39.99)
4. Set up webhook endpoint: /api/webhooks/stripe
5. Copy Price IDs and webhook secret

## Step 3: Vercel Setup
1. Push code to GitHub
2. Import to Vercel
3. Add all environment variables
4. Deploy

## Step 4: Verify
1. Test signup flow
2. Test payment with card 4242424242424242
3. Test welcome page
4. Test day content
5. Test quiz submission
6. Test admin panel

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID_USD
- STRIPE_PRICE_ID_GBP
- NEXT_PUBLIC_BASE_URL
