import { getServiceSupabase, getUserFromRequest, verifyAdminAccess } from '../../../lib/serverAuth';
import Stripe from 'stripe';

/**
 * Admin API: Backfill net_amount_cents for existing payments
 *
 * POST /api/admin/backfill-net-amounts
 * Body: { dryRun?: boolean } - Set to true to preview without updating
 *
 * Fetches net amounts from Stripe balance_transaction for all payments
 * that don't have net_amount_cents stored yet.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // SECURITY: Verify admin authorization
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { dryRun = false } = req.body;
    const supabase = getServiceSupabase();

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Stripe configuration missing' });
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Get all payments that need net_amount_cents backfilled
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('id, payment_intent_id, amount_cents, net_amount_cents')
      .eq('status', 'succeeded')
      .is('net_amount_cents', null)
      .not('payment_intent_id', 'is', null);

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch payments: ' + fetchError.message });
    }

    if (!payments || payments.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No payments need backfilling',
        updated: 0,
        total: 0,
      });
    }

    console.log(`Found ${payments.length} payments to backfill`);

    const results = {
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Process payments in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (payment) => {
          try {
            // Fetch payment intent with balance transaction
            const paymentIntent = await stripe.paymentIntents.retrieve(payment.payment_intent_id);

            const balanceTransactionId = paymentIntent.charges?.data?.[0]?.balance_transaction;
            if (!balanceTransactionId) {
              console.warn(`No balance_transaction for payment ${payment.id}`);
              results.failed++;
              return;
            }

            // Fetch balance transaction to get net amount
            const balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransactionId);
            const netAmountCents = balanceTransaction.net;

            if (dryRun) {
              console.log(`[DRY RUN] Would update payment ${payment.id}: ${netAmountCents} cents`);
              results.updated++;
            } else {
              // Update payment with net amount
              const { error: updateError } = await supabase
                .from('payments')
                .update({ net_amount_cents: netAmountCents })
                .eq('id', payment.id);

              if (updateError) {
                console.error(`Error updating payment ${payment.id}:`, updateError);
                results.failed++;
                results.errors.push({ paymentId: payment.id, error: updateError.message });
              } else {
                results.updated++;
              }
            }
          } catch (err) {
            console.error(`Error processing payment ${payment.id}:`, err.message);
            results.failed++;
            results.errors.push({ paymentId: payment.id, error: err.message });
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < payments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return res.status(200).json({
      success: true,
      message: dryRun
        ? `[DRY RUN] Would update ${results.updated} payments`
        : `Updated ${results.updated} payments`,
      dryRun,
      total: payments.length,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });

  } catch (err) {
    console.error('Backfill error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
