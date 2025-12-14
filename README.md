# Market Warrior - 30-Day Trading Challenge

A comprehensive trading education platform built with Next.js 14, Supabase, and Stripe.

## Features

- 📚 30-day structured trading course
- 📝 Interactive quizzes with server-side validation
- ✅ Daily task completion tracking
- 🎓 Certificate generation upon completion
- 💰 Affiliate program (25-30% commission)
- 👤 Admin panel for content management
- 📊 Free trading journal
- 🔐 Device fingerprinting for license protection

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Backend:** Supabase (Auth, Database, Storage)
- **Payments:** Stripe
- **Email:** Resend
- **Deployment:** Vercel

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/marketwarriorproject.git
cd marketwarriorproject
npm install
```

### 2. Set Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
RESEND_API_KEY=your_resend_key (optional)
```

### 3. Run Locally

```bash
npm run dev
```

### 4. Deploy

Push to GitHub and connect to Vercel. Set environment variables in Vercel dashboard.

## Project Structure

```
├── app/
│   ├── admin/          # Admin panel pages
│   ├── api/            # API routes
│   ├── day/[day]/      # Dynamic day pages
│   ├── dashboard/      # User dashboard
│   ├── checkout/       # Payment flow
│   └── ...
├── lib/
│   ├── supabase.js     # Supabase client
│   └── ...
├── sql/
│   └── missing-tables.sql  # Additional tables SQL
└── public/
    └── logo.png        # Site logo
```

## Database Tables

- `user_profiles` - User data and progress
- `course_content` - Day lessons and content
- `quiz_questions` - Quiz questions per day
- `quiz_results` - User quiz attempts
- `challenge_progress` - Day completion tracking
- `task_submissions` - Task uploads
- `payments` - Payment records
- `referrals` - Affiliate referrals
- `announcements` - Live feed items
- `promo_codes` - Discount codes
- `site_settings` - Configuration

## Admin Access

1. Create account at /signup
2. In Supabase, set `is_admin = true` for your user
3. Access admin at /admin

## License

Proprietary - All rights reserved.
