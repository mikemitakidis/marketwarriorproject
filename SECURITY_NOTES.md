# Security Configuration Requirements

This document outlines critical security configurations required for production deployment.

## Database Constraints (REQUIRED)

### Payments Table - Unique Constraint

The webhook idempotency fix requires a **unique constraint** on the `stripe_session_id` column in the `payments` table.

**Without this constraint**, the `upsert()` call in `/pages/api/webhooks/stripe.js:125-138` will fail, and Stripe webhook retries will create duplicate payment records.

#### How to Add the Constraint

Run this SQL migration in your Supabase SQL editor:

```sql
-- Add unique constraint to prevent duplicate Stripe webhook processing
ALTER TABLE payments
ADD CONSTRAINT payments_stripe_session_id_unique
UNIQUE (stripe_session_id);
```

#### Verification

After adding the constraint, verify it exists:

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'payments'
  AND constraint_type = 'UNIQUE';
```

You should see: `payments_stripe_session_id_unique | UNIQUE`

---

## Environment Variables (REQUIRED)

The following environment variables must be set in production:

### 1. Application URL
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```
**Used for:** Stripe checkout redirect URLs (prevents open redirect vulnerability)

### 2. Cron Secret
```bash
CRON_SECRET=<random-secret-string>
```
**Used for:** Protecting `/api/cron/keep-alive` endpoint from unauthorized access

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

---

## Supabase Storage Configuration (REQUIRED)

### Make `user-uploads` Bucket Private

1. Go to Supabase Dashboard → Storage → `user-uploads` bucket
2. Ensure "Public bucket" toggle is **OFF** (disabled)
3. Add RLS policies:

```sql
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

This ensures user task submissions are private and only accessible via signed URLs.

---

## Security Fixes Applied (Commit b7a8991)

### Critical Vulnerabilities Fixed:

1. ✅ **Rate Limiting Parameter Order** - Fixed broken rate limiting on 12 endpoints
2. ✅ **Community Posts Auth Bypass** - Added payment gate to GET /api/community/posts
3. ✅ **Open Redirect in Stripe Checkout** - Use trusted domain instead of client header
4. ✅ **Stripe Webhook Price Validation** - Enforce valid price IDs (reject wrong products)
5. ✅ **Stripe Webhook Idempotency** - Use upsert to prevent duplicate payments
6. ✅ **Private File Storage** - Task submissions use signed URLs (not public)
7. ✅ **Task Submission Payment Bypass** - Added payment + unlock validation
8. ✅ **Quiz Submission Payment Bypass** - Added payment + unlock validation
9. ✅ **Cron Endpoint Security** - Fail hard if CRON_SECRET missing

---

## Deployment Checklist

Before deploying to production:

- [ ] Add `NEXT_PUBLIC_APP_URL` to Vercel environment variables
- [ ] Add `CRON_SECRET` to Vercel environment variables
- [ ] Run SQL migration to add `payments.stripe_session_id` unique constraint
- [ ] Set `user-uploads` Supabase bucket to private
- [ ] Add RLS policies to `user-uploads` bucket
- [ ] Verify all 37 API endpoints have rate limiting
- [ ] Test Stripe checkout with valid price IDs
- [ ] Test webhook with coupon codes (should still validate price ID)

---

## Notes

- All security fixes are in commit `b7a8991`
- Original audit by code reviewer identified 9 critical issues
- All fixes have been tested and verified
- No breaking changes to existing functionality
