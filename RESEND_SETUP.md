# Resend Email Setup Guide

## Overview

Resend is used for sending emails:
- Welcome emails
- Password reset
- Admin bulk emails
- Lead nurturing

## Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up for free account
3. Verify your email

## Step 2: Add Domain (Recommended)

1. Go to Domains > Add Domain
2. Enter your domain (e.g., marketwarrior.com)
3. Add the DNS records to your domain registrar:
   - TXT record for verification
   - MX records (if using for receiving)
   - DKIM records

## Step 3: Get API Key

1. Go to API Keys
2. Click "Create API Key"
3. Name it (e.g., "Market Warrior Production")
4. Copy the key (starts with `re_`)

## Step 4: Configure in Vercel

Add environment variable:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

## Step 5: Update Email Settings (Optional)

In `lib/email.js`, update the FROM address:
```javascript
from: 'Market Warrior <hello@marketwarrior.com>'
```

## Email Templates

The system sends these emails:
- **Welcome Email** - After purchase confirmation
- **Day Unlock Notification** - When new day unlocks
- **Certificate Ready** - After completing all 30 days
- **Admin Bulk Email** - Custom emails from admin panel

## Testing

1. In Admin > Emails, send a test email
2. Check Resend dashboard for delivery status
3. Check spam folder if not received

## Free Tier Limits

- 3,000 emails/month free
- 100 emails/day
- Sufficient for starting out

## Troubleshooting

### Emails going to spam
- Add SPF record
- Verify DKIM is set up
- Use custom domain instead of Resend's

### Emails not sending
- Check API key is correct
- Check Resend dashboard for errors
- Verify domain is verified
