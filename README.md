# Market Warrior - 30-Day Trading Challenge

A fully functional Next.js 14 trading education platform.

## Features

✅ **Authentication**
- Email/password signup & login
- Google OAuth
- Password reset
- Session management

✅ **Payment**
- Stripe checkout ($39.99)
- Webhook handling
- Payment status tracking

✅ **Course Content**
- 30-day progressive learning
- Daily quizzes with score tracking
- Task submissions
- Day unlocking system (time + quiz based)

✅ **Trading Journal**
- Log trades with entry/exit prices
- Calculate P&L automatically
- Win rate & profit factor stats
- Trade history

✅ **Certificate**
- Generated on course completion
- Printable/downloadable
- User's name displayed

✅ **Admin Panel**
- User management
- Stats dashboard
- Grant/revoke access

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create Supabase project
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Go to SQL Editor and run the contents of `database-schema.sql`

### 3. Configure environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard > Developers > API keys
3. Create a webhook endpoint for `/api/stripe/webhook`
4. Set the webhook secret in `.env.local`

## Make Yourself Admin

After creating your account, run this in Supabase SQL Editor:
```sql
UPDATE public.users SET is_admin = true WHERE email = 'your@email.com';
```

## Deployment (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Add all environment variables
4. Deploy

**Important:** Update `NEXT_PUBLIC_APP_URL` to your production URL.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login/Register |
| `/welcome` | Onboarding & terms |
| `/dashboard` | User dashboard |
| `/days/[1-30]` | Daily lessons + quizzes |
| `/journal` | Trading journal |
| `/certificate` | Certificate (after completion) |
| `/admin` | Admin panel |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/callback` | GET | OAuth callback |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe events |
| `/api/quiz/submit` | POST | Submit quiz answers |
| `/api/task/submit` | POST | Submit daily task |
| `/api/progress` | GET | Get user progress |
| `/api/journal` | GET/POST/DELETE | Trading journal CRUD |
| `/api/admin/stats` | GET | Admin statistics |
| `/api/admin/users` | GET/PATCH | User management |

## Database Schema

See `database-schema.sql` for complete schema. Key tables:
- `users` - User profiles, progress, payments
- `journal_entries` - Trading journal
- `referrals` - Affiliate tracking

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (Auth + PostgreSQL)
- Stripe (Payments)
- Styled JSX (CSS)

## License

Copyright © 2025 Market Warrior. All rights reserved.
