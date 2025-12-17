# MarketWarrior Rebuild (Clean Flow)

This project implements the exact flow you confirmed:

- Register (name + email + password OR Google) -> confirm email -> pay -> welcome (mandatory) -> dashboard
- Login (email+password OR Google) -> dashboard (with gating)
- If user signs out and hasn't confirmed email / paid / completed welcome, they will NOT reach dashboard.

## Quick start

1) Install
```bash
npm i
cp .env.example .env.local
npm run dev
```

2) Supabase
- Run `supabase/schema.sql` in Supabase SQL Editor (one file).
- Ensure Auth: Email confirmations ON.
- Set Site URL + Redirect URLs to include:
  - http://localhost:3000
  - http://localhost:3000/auth/callback
  - https://YOUR_DOMAIN/auth/callback

3) Stripe
- Create a Product + one-time Price.
- Put the Price ID in `STRIPE_PRICE_ID`.
- Add webhook endpoint:
  - https://YOUR_DOMAIN/api/webhooks/stripe
- Enable event: `checkout.session.completed`

Refund handling (optional but supported):
- Enable event: `charge.refunded`
- Refunds will automatically revoke access (sets `has_paid=false`).

## Where to paste your exact template design

Each page has a clearly marked section:
`// PASTE YOUR TEMPLATE MARKUP HERE (keep 1:1 design)`

Replace the placeholder JSX with your HTML (convert `class` -> `className`).
