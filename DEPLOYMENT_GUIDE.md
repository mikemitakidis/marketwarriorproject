# Market Warrior - Quick Deployment Guide

## 1. Supabase Setup (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor**
3. Copy and paste contents of `sql/schema.sql` and run
4. Copy and paste contents of `sql/content.sql` and run (loads 30 days + 151 quiz questions)
5. Go to **Storage** → Create bucket named `user-uploads` (set to public)
6. Go to **Settings → API** and copy:
   - Project URL
   - anon public key
   - service_role key (⚠️ keep secret!)

## 2. Stripe Webhook Setup (3 minutes)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. URL: `https://YOUR-DOMAIN.vercel.app/api/webhooks/stripe`
4. Events: Select `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_`)

Your existing prices:
- **USD**: `price_1SZq7P8SNp2YoTH67FkC4Oir` ($39.99)
- **GBP**: `price_1Sd0gA8SNp2YoTH6yiDWpmZC` (£39.99)

## 3. Vercel Deployment (5 minutes)

### Option A: CLI Deploy
```bash
cd market-warrior-nextjs
npm install -g vercel
vercel
```

### Option B: Git Deploy
1. Push to GitHub
2. Import in Vercel dashboard
3. Deploy

### Environment Variables (set in Vercel Dashboard)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PRICE_ID=price_1SZq7P8SNp2YoTH67FkC4Oir
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
FROM_EMAIL=Market Warrior <noreply@marketwarrior.club>
NEXT_PUBLIC_APP_URL=https://marketwarriorproject.vercel.app
```

## 4. Make Yourself Admin

In Supabase SQL Editor:
```sql
UPDATE user_profiles 
SET is_admin = true 
WHERE email = 'your@email.com';
```

## 5. Test Flow

1. ✅ Visit site → Landing page
2. ✅ Sign up → Redirect to checkout
3. ✅ Pay with test card `4242 4242 4242 4242`
4. ✅ Accept terms → Dashboard
5. ✅ Complete Day 1 (quiz + task)
6. ✅ Check admin panel

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 errors | Check Supabase anon key |
| 500 errors | Check Supabase service key |
| Payment not updating user | Check webhook secret |
| Can't access admin | Run SQL to set is_admin=true |

## Support

File structure:
```
/app - Next.js pages
/api - API routes (all server-side)
/lib - Utilities (supabase, email, fingerprint)
/sql - Database schema and content
```
