# Deployment Guide - Market Warrior

## Prerequisites

- GitHub account
- Vercel account  
- Supabase account
- Stripe account

## Step 1: Supabase Setup

### 1.1 Create Database Tables

Run the SQL in `sql/missing-tables.sql` and `sql/fix-rls-policies.sql` in Supabase SQL Editor.

### 1.2 Create Storage Bucket

1. Go to Storage > New Bucket
2. Name: `user-uploads`
3. Make it public

### 1.3 Get API Keys

From Project Settings > API:
- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - anon public key
- `SUPABASE_SERVICE_KEY` - service_role secret key (keep secure!)

## Step 2: Stripe Setup

### 2.1 Create Products

1. Go to Products > Add product
2. Create "30-Day Trading Challenge" at $39.99
3. Create GBP version at £39.99 (optional)
4. Copy the price IDs

### 2.2 Set Up Webhook

1. Go to Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted` (optional)
4. Copy webhook signing secret

## Step 3: Vercel Deployment

### 3.1 Connect Repository

1. Push code to GitHub
2. Import project in Vercel
3. Select the repository

### 3.2 Environment Variables

Add in Vercel Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 3.3 Deploy

Click Deploy. Vercel will automatically build and deploy.

## Step 4: Post-Deployment

### 4.1 Verify Webhook

Make a test purchase or check Stripe webhook logs.

### 4.2 Create Admin User

1. Sign up at /signup
2. In Supabase Table Editor, find your user_profiles row
3. Set `is_admin = true`
4. Login to access /admin

### 4.3 Add Course Content

In Admin > Content, add content for all 30 days.

## Troubleshooting

### "Email not confirmed" error
- Ensure signup uses server-side API route
- Check Supabase Auth settings

### "Database error saving user"  
- Run `sql/fix-rls-policies.sql` in Supabase

### Payment not recorded
- Check Stripe webhook is active
- Verify webhook secret is correct
- Check Vercel function logs

## Support

For issues, check:
1. Vercel deployment logs
2. Supabase database logs
3. Stripe webhook logs
