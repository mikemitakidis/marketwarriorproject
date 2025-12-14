# Verification Checklist - Market Warrior

Use this checklist to verify your deployment is working correctly.

## Pre-Launch Checklist

### Environment Variables
- [ ] NEXT_PUBLIC_SUPABASE_URL is set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY is set
- [ ] SUPABASE_SERVICE_KEY is set
- [ ] STRIPE_SECRET_KEY is set
- [ ] STRIPE_WEBHOOK_SECRET is set
- [ ] NEXT_PUBLIC_APP_URL is set

### Supabase Database
- [ ] user_profiles table exists
- [ ] course_content table has 30 days of content
- [ ] quiz_questions table has questions for each day
- [ ] All other tables created (run missing-tables.sql)
- [ ] RLS policies applied (run fix-rls-policies.sql)

### Supabase Storage
- [ ] user-uploads bucket exists
- [ ] Bucket is public

### Stripe
- [ ] Product created ($39.99 USD)
- [ ] Webhook endpoint configured
- [ ] Webhook events selected (checkout.session.completed)

## Functional Testing

### Authentication Flow
- [ ] Can sign up new account
- [ ] Receives no "Email not confirmed" error
- [ ] Can log in after signup
- [ ] Can log out

### Payment Flow
- [ ] Redirected to checkout after signup
- [ ] Promo code validation works
- [ ] Stripe checkout loads
- [ ] Payment completes successfully
- [ ] Redirected to welcome page after payment

### Course Access
- [ ] Welcome page shows after payment
- [ ] Can agree to terms and start challenge
- [ ] Dashboard shows Day 1 unlocked
- [ ] Can access Day 1 content
- [ ] Quiz loads with questions
- [ ] Quiz submission works
- [ ] Task submission works
- [ ] Day 2 unlocks after 24 hours (or test bypass)

### Admin Panel
- [ ] Admin user can access /admin
- [ ] Can view all users
- [ ] Can edit course content
- [ ] Can create promo codes
- [ ] Can send bulk emails
- [ ] Can manage affiliates
- [ ] Can view payments

### Affiliate System
- [ ] Affiliate code displays in dashboard
- [ ] Copy affiliate link works
- [ ] Referral tracking works (test with link)

### Certificate
- [ ] Certificate generates after Day 30
- [ ] Can download certificate
- [ ] Name displays correctly

## Post-Launch Monitoring

- [ ] Monitor Stripe webhook logs
- [ ] Monitor Vercel function logs
- [ ] Monitor Supabase auth logs
- [ ] Set up uptime monitoring (optional)

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Email not confirmed" | Run fix-rls-policies.sql, redeploy |
| "Database error" | Check RLS policies, check column names |
| Payment not recorded | Check webhook secret, check Stripe logs |
| Can't access admin | Set is_admin=true in user_profiles |
| Quiz won't submit | Check quiz_questions has data |
| File upload fails | Check storage bucket exists & is public |
