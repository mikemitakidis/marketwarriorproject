# Market Warrior 30-Day Trading Challenge Platform

A complete trading education platform with authentication, payments, and course progression.

## 🔑 Your Credentials (Pre-Configured)

**Supabase (Already in files):**
- URL: `https://gvpaendpmwyncdztlczy.supabase.co`
- Anon Key: Already embedded in HTML files

**Stripe Product:**
- Product ID: `prod_TWtuQ72mY4csdx`
- USD Price ID: `price_1SZq7P8SNp2YoTH67FkC4Oir` ($39.99)

**Site URL:**
- `https://marketwarriorproject.vercel.app`

## 📁 Files Included

```
├── api/
│   ├── checkout/stripe.js    # Payment processing
│   ├── webhooks/stripe.js    # Payment verification
│   ├── day/[day].js          # Day content with quizzes
│   ├── promo/validate.js     # Promo code validation
│   └── quiz/submit.js        # Quiz submission
├── public/
│   ├── index.html            # Landing page ($39.99 USD)
│   ├── login.html            # Authentication
│   ├── welcome.html          # Onboarding + Terms
│   ├── dashboard.html        # User dashboard
│   ├── day.html              # Day content viewer
│   ├── journal.html          # Trading journal (8 tabs)
│   ├── certificate.html      # Completion certificate
│   ├── terms.html            # Terms of service
│   ├── privacy.html          # Privacy policy
│   └── logo.png              # Logo
├── vercel.json               # Routing config
└── package.json              # Dependencies
```

## 🔐 Vercel Environment Variables Required

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://gvpaendpmwyncdztlczy.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cGFlbWRwbXd5bmNkenRsY3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDY1NTAsImV4cCI6MjA4MDk4MjU1MH0.kg6mlLcHv3APGnIeE7vRJpzF1u8JUyGKsYthXQXEAAE` |
| `STRIPE_SECRET_KEY` | Your `sk_live_...` key |
| `SITE_URL` | `https://marketwarriorproject.vercel.app` |

## 🎯 Promo Codes

- `WARRIOR10` - 10% off
- `LAUNCH20` - 20% off
- `EARLY25` - 25% off
- `VIP30` - 30% off
- `FRIEND15` - 15% off

## 🔧 After Deployment: Stripe Webhook Setup

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://marketwarriorproject.vercel.app/api/webhooks/stripe`
4. Events: `checkout.session.completed`, `charge.refunded`
5. Copy signing secret → Add as `STRIPE_WEBHOOK_SECRET` in Vercel

---
© 2024 Market Warrior. All rights reserved.
