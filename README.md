# Market Warrior - 30-Day Trading Challenge

A comprehensive trading education platform built with Next.js and Supabase.

## Features
- 30-day structured trading course
- Daily lessons, quizzes, and tasks
- Progress tracking
- Certificate generation
- Affiliate program
- Admin panel

## Tech Stack
- Next.js 14
- Supabase (Auth + Database)
- Stripe Payments
- Vercel Deployment

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_USD=
STRIPE_PRICE_ID_GBP=
NEXT_PUBLIC_BASE_URL=
```

## Deployment
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

## Security
- Server-side quiz validation
- RLS policies on all tables
- Server-controlled timestamps
- Price ID verification
