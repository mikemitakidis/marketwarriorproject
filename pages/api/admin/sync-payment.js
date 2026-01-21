import Stripe from 'stripe';
import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';

/**
 * Sync a payment from Stripe to database.
 *
 * POST /api/admin/sync-payment
 * Body: { email: "user@example.com" }
 *
 * Checks Stripe for successful payments by this customer email,
 * then updates user_profiles.has_paid = true if found.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY: Verify admin authorization (checks is_admin + email allowlist)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabaseAdmin = getServiceSupabase();

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Find user in auth.users by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return res.status(500).json({ error: 'Failed to list users' });
    }

    const targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Search Stripe for checkout sessions with this email
    const sessions = await stripe.checkout.sessions.list({
      customer_details: { email: email.toLowerCase() },
      limit: 10,
    });

    // Find a successful payment
    const successfulSession = sessions.data.find(s => s.payment_status === 'paid');

    if (!successfulSession) {
      // Also try searching by customer email directly
      const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
      if (customers.data.length > 0) {
        const charges = await stripe.charges.list({ customer: customers.data[0].id, limit: 10 });
        const successfulCharge = charges.data.find(c => c.status === 'succeeded');
        if (successfulCharge) {
          // Found a successful charge - update database
          const now = new Date().toISOString();

          await supabaseAdmin.from('user_profiles').upsert({
            id: targetUser.id,
            has_paid: true,
            paid_at: now,
          }, { onConflict: 'id' });

          await supabaseAdmin.from('payments').upsert({
            user_id: targetUser.id,
            stripe_session_id: successfulCharge.id,
            amount_cents: successfulCharge.amount,
            currency: successfulCharge.currency,
            status: 'succeeded',
            paid_at: now,
          }, { onConflict: 'user_id' });

          return res.status(200).json({
            success: true,
            message: `Payment synced for ${email}`,
            chargeId: successfulCharge.id
          });
        }
      }
      return res.status(404).json({ error: 'No successful payment found in Stripe for this email' });
    }

    // Update database with found session
    const now = new Date().toISOString();

    await supabaseAdmin.from('user_profiles').upsert({
      id: targetUser.id,
      has_paid: true,
      paid_at: now,
    }, { onConflict: 'id' });

    await supabaseAdmin.from('payments').upsert({
      user_id: targetUser.id,
      stripe_session_id: successfulSession.id,
      amount_cents: successfulSession.amount_total,
      currency: successfulSession.currency,
      status: 'succeeded',
      paid_at: now,
    }, { onConflict: 'user_id' });

    // Create day 1 progress
    await supabaseAdmin.from('challenge_progress').upsert({
      user_id: targetUser.id,
      day: 1,
      unlocked: true,
    }, { onConflict: 'user_id,day' });

    return res.status(200).json({
      success: true,
      message: `Payment synced for ${email}`,
      sessionId: successfulSession.id
    });

  } catch (err) {
    console.error('Sync payment error:', err);
    return res.status(500).json({ error: err.message });
  }
}
