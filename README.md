# 📈 Market Warrior - 30-Day Trading Challenge

A Next.js-based course platform with Supabase backend, Stripe payments, and Resend emails.

## Features

- ✅ 30-day structured course with daily lessons, quizzes, and tasks
- ✅ Server-side quiz scoring (anti-cheat)
- ✅ Server-time unlock logic (can't cheat by changing device clock)
- ✅ Stripe payment integration ($39.99)
- ✅ Device fingerprinting (2 device limit)
- ✅ Trading Journal with Excel export
- ✅ Certificate generation on completion
- ✅ Full admin panel

## Admin Panel Features

| Feature | Description |
|---------|-------------|
| 👥 Users | Grant/revoke access, admin toggle, device reset |
| 📝 Content | Edit day content, lessons, tasks |
| 🎟️ Promo Codes | Create discount codes |
| 🤝 Affiliates | Track referral commissions |
| 💳 Payments | View transaction history |
| 📧 Email Campaigns | Send bulk emails with templates |
| 📢 Live Feed | Post announcements to dashboard |
| ⚙️ Settings | Configure pricing, limits |

## Quick Deploy

1. **Supabase**: Run `sql/schema.sql` then `sql/content.sql`
2. **Stripe**: Add webhook to `/api/webhooks/stripe`
3. **Vercel**: Push to GitHub (auto-deploys)
4. **Environment Variables**: Add to Vercel dashboard

See `DEPLOYMENT_GUIDE.md` for detailed instructions.
See `RESEND_SETUP.md` for email configuration.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
FROM_EMAIL=Market Warrior <hello@marketwarrior.club>
NEXT_PUBLIC_APP_URL=https://marketwarriorproject.vercel.app
```

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Auth + Database + Storage)
- Stripe (Payments)
- Resend (Emails)
- Vercel (Hosting)
