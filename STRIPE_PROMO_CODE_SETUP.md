# 🎟️ STRIPE PROMOTION CODE SETUP GUIDE

## THE ISSUE
Your Stripe account has **Coupons** (the discount rules), but NOT **Promotion Codes** (the customer-facing codes).

**Coupons** = Internal discount rules (like "10% off")  
**Promotion Codes** = What customers type at checkout (like "WARRIOR10")

You need to create Promotion Codes for each coupon.

---

## ⏱️ TIME REQUIRED: 5-10 minutes

---

## STEP-BY-STEP INSTRUCTIONS

### Step 1: Go to Stripe Dashboard
1. Open: https://dashboard.stripe.com
2. Log in to your account

### Step 2: Navigate to Coupons
1. Click **Products** in the left sidebar
2. Click **Coupons** tab

### Step 3: Create Promotion Codes for Each Coupon

For each coupon, you need to add a promotion code:

#### COUPON: 10% Off (WARRIOR10)
1. Click on the "WARRIOR10 - 10% Off" coupon
2. Scroll down to **Promotion codes** section
3. Click **+ Add promotion code**
4. Enter:
   - **Code**: `WARRIOR10`
   - Leave other settings as default
5. Click **Add**

#### COUPON: 15% Off (FRIEND15)
1. Click on the "FRIEND15 - 15% Off" coupon
2. Scroll down to **Promotion codes** section
3. Click **+ Add promotion code**
4. Enter:
   - **Code**: `FRIEND15`
5. Click **Add**

#### COUPON: 20% Off (LAUNCH20)
1. Click on the "LAUNCH20 - 20% Off" coupon
2. Scroll down to **Promotion codes** section
3. Click **+ Add promotion code**
4. Enter:
   - **Code**: `LAUNCH20`
5. Click **Add**

#### COUPON: 25% Off (EARLY25)
1. Click on the "EARLY25 - 25% Off" coupon
2. Scroll down to **Promotion codes** section
3. Click **+ Add promotion code**
4. Enter:
   - **Code**: `EARLY25`
5. Click **Add**

#### COUPON: 30% Off (VIP30)
1. Click on the "VIP30 - 30% Off" coupon
2. Scroll down to **Promotion codes** section
3. Click **+ Add promotion code**
4. Enter:
   - **Code**: `VIP30`
5. Click **Add**

#### COUPON: 100% Off (FREETEST) - FOR YOUR TESTING
1. Click on the "FREETEST" coupon
2. Scroll down to **Promotion codes** section
3. Click **+ Add promotion code**
4. Enter:
   - **Code**: `FREETEST`
5. Click **Add**

---

## VERIFICATION

After creating all promotion codes:

1. Go to **Products** → **Coupons**
2. Click on any coupon
3. You should see the promotion code listed under **Promotion codes**

---

## HOW IT WORKS NOW

1. Customer visits your site
2. Clicks "Start Challenge" → Goes to login/register
3. Clicks "Purchase Challenge"
4. Redirected to Stripe checkout page
5. Customer clicks **"Add promotion code"** link on Stripe page
6. Enters code like `VIP30`
7. Discount automatically applied!

---

## PROMO CODE SUMMARY

| Code | Discount | Use Case |
|------|----------|----------|
| WARRIOR10 | 10% off | Standard discount |
| FRIEND15 | 15% off | Friend referrals |
| LAUNCH20 | 20% off | Launch promotion |
| EARLY25 | 25% off | Early bird discount |
| VIP30 | 30% off | VIP customers |
| FREETEST | 100% off | YOUR TESTING ONLY |

---

## NEED HELP?

If you have issues:
1. Make sure you're in the **LIVE** mode (not test mode) if testing with real transactions
2. Check that the promotion code is **Active** (not archived)
3. Verify the underlying coupon is also active

---

## QUICK LINK

Direct link to create coupons/promo codes:
https://dashboard.stripe.com/coupons/create
