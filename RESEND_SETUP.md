# 📧 Resend Email Setup Guide

Resend is used for sending all emails from Market Warrior - both automatic transactional emails and manual campaigns from the admin panel.

## Step 1: Create Resend Account (Free)

1. Go to **https://resend.com**
2. Click **"Start building"** or **"Sign up"**
3. Sign up with your email (or GitHub/Google)
4. Verify your email address

## Step 2: Get Your API Key

1. Once logged in, go to **https://resend.com/api-keys**
2. Click **"Create API Key"**
3. Give it a name: `Market Warrior Production`
4. Permissions: Select **"Sending access"** → **"Full access"**
5. Click **"Add"**
6. **COPY THE API KEY NOW** (it starts with `re_`)
   - ⚠️ You can only see it once! Save it somewhere safe.

Example: `re_123abc456def789ghi`

## Step 3: Verify Your Domain (Recommended)

Without domain verification, emails are sent from `onboarding@resend.dev` which looks unprofessional and may go to spam.

### To verify your domain:

1. Go to **https://resend.com/domains**
2. Click **"Add Domain"**
3. Enter your domain: `marketwarrior.club` (or your domain)
4. Add the DNS records Resend gives you:

| Type | Name | Value |
|------|------|-------|
| TXT | @ or domain | `v=spf1 include:_spf.resend.com ~all` |
| TXT | resend._domainkey | (long DKIM value they provide) |

5. Wait 5-10 minutes, then click **"Verify"**
6. Once verified ✅, you can send from any email@yourdomain.com

### Where to add DNS records:
- **GoDaddy**: DNS Management → Add Record
- **Cloudflare**: DNS → Add Record
- **Namecheap**: Domain List → Manage → Advanced DNS

## Step 4: Add to Vercel Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables**

Add these two:

| Key | Value | Example |
|-----|-------|---------|
| `RESEND_API_KEY` | Your API key | `re_123abc456def789ghi` |
| `FROM_EMAIL` | Sender name and email | `Market Warrior <hello@marketwarrior.club>` |

⚠️ If domain NOT verified, use:
```
FROM_EMAIL=Market Warrior <onboarding@resend.dev>
```

## Step 5: Test It Works

1. Deploy your site to Vercel
2. Go to Admin Panel → **Email Campaigns**
3. Click **"+ New Campaign"**
4. Select template **"Custom Email"**
5. Set audience to **"Custom"** and enter your own email
6. Write a test subject and content
7. Click **"Send Campaign"**
8. Check your inbox!

---

## What Emails Are Sent Automatically?

| Email | When | Content |
|-------|------|---------|
| **Welcome** | After payment completes | Welcome + getting started |
| **Day Unlock** | New day becomes available | Reminder to continue |
| **Completion** | Finish Day 30 | Congratulations + certificate link |
| **Journal Lead** | Signup for free journal | Template delivery |

These are in `/lib/email.js` and triggered by the app automatically.

---

## Admin Panel Email Campaigns

From **Admin → Email Campaigns** you can:

✅ Send to **All Users**
✅ Send to **Paid Users Only**  
✅ Send to **Unpaid Users** (people who signed up but didn't buy)
✅ Send to **Journal Leads** (free signup list)
✅ Send to **Custom email list**

### Built-in Templates:
- 👋 **Welcome Back** - Re-engage inactive users
- 🎁 **Special Offer** - Promote discounts/promo codes
- 📚 **New Content** - Announce updates
- ⏰ **Reminder** - Daily lesson reminders
- ✏️ **Custom** - Write your own

### Personalization Variables:
Use these in your emails (they get replaced automatically):

| Variable | Replaced With |
|----------|---------------|
| `{name}` | User's name (or "Trader") |
| `{email}` | User's email |
| `{app_url}` | Your website URL |
| `{current_day}` | Their current day |
| `{promo_code}` | Default: WARRIOR20 |
| `{discount}` | Default: 20 |

---

## Resend Free Tier Limits

- **100 emails/day** free
- **3,000 emails/month** free

For higher volumes, Resend Pro is $20/month for 50,000 emails.

---

## Troubleshooting

### Emails going to spam?
1. Verify your domain (Step 3)
2. Make sure FROM_EMAIL matches your verified domain
3. Avoid spam words in subject lines

### "API key invalid" error?
1. Check the key starts with `re_`
2. Make sure no extra spaces when you pasted it
3. Try creating a new API key

### No emails sending?
1. Check Vercel logs for errors
2. Verify RESEND_API_KEY is set in Vercel env vars
3. Test with a simple campaign to your own email

---

## Quick Reference

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=Market Warrior <hello@marketwarrior.club>
```

Dashboard: https://resend.com/emails (see all sent emails)
API Keys: https://resend.com/api-keys
Domains: https://resend.com/domains
