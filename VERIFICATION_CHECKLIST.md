# Verification Checklist

## Authentication
- [ ] Signup creates user and profile
- [ ] Email confirmation works
- [ ] Login works
- [ ] Logout works

## Payment
- [ ] Checkout redirects to Stripe
- [ ] Webhook updates has_paid
- [ ] Promo codes apply discount

## Welcome/Terms
- [ ] All 5 checkboxes required
- [ ] Name saved permanently
- [ ] Server sets all timestamps
- [ ] Affiliate code generated

## Course Content
- [ ] Day 1 unlocks immediately
- [ ] Quiz questions load (NO answers visible)
- [ ] Quiz submission returns results
- [ ] 60% required to pass
- [ ] Task submission works
- [ ] Next day unlocks after 24h

## Security
- [ ] Quiz answers never sent to client
- [ ] Dates set server-side only
- [ ] Content requires payment + terms
- [ ] RLS blocks unauthorized access

## Admin
- [ ] Admin panel loads
- [ ] User list shows
- [ ] Content editor works
