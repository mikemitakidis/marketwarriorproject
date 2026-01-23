import { getServiceSupabase, getUserFromRequest , verifyAdminAccess } from '../../../lib/serverAuth';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';
import logger from '../../../lib/logger';
import Stripe from 'stripe';

/**
 * API route: /api/admin/users
 *
 * Admin API for managing users.
 *
 * GET: List users with stats
 *   - ?userId=xxx - Get specific user details
 *   - ?search=email - Search by email
 *   - No params - List all users
 *
 * POST: Admin actions
 *   - action: 'unlock_all' - Unlock all 30 days for a user
 *   - action: 'reset_user' - Reset user progress (delete all progress data)
 */
export default async function handler(req, res) {
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

    // Apply rate limiting
    const identifier = getIdentifier(req);
    const rateLimitResult = await applyRateLimit(req, res, rateLimiters.admin, identifier);
    if (rateLimitResult) return rateLimitResult;

    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      return handleGet(req, res, supabase);
    } else if (req.method === 'POST') {
      return handlePost(req, res, supabase, user);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    logger.error('Admin users error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

async function handleGet(req, res, supabase) {
  const { userId, search } = req.query;

  if (userId) {
    // Get specific user details
    return getUserDetails(res, supabase, userId);
  }

  // List all users
  let query = supabase
    .from('user_profiles')
    .select('id, email, full_name, has_paid, paid_at, is_admin, created_at, last_active, suspended_until, suspension_reason, access_expires_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  const { data: users, error } = await query.limit(100);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Get progress stats for each user
  const userIds = users.map(u => u.id);

  const { data: progressData } = await supabase
    .from('challenge_progress')
    .select('user_id, completed')
    .in('user_id', userIds);

  const { data: quizData } = await supabase
    .from('quiz_attempts')
    .select('user_id, passed')
    .in('user_id', userIds);

  // Get onboarding data to check unlock status
  const { data: onboardingData } = await supabase
    .from('user_onboarding')
    .select('user_id, welcome_completed_at')
    .in('user_id', userIds);

  // Build onboarding map - check if all days unlocked (welcome_completed_at > 29 days ago)
  const onboardingMap = {};
  const now = new Date();
  (onboardingData || []).forEach(o => {
    if (o.welcome_completed_at) {
      const startDate = new Date(o.welcome_completed_at);
      const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
      onboardingMap[o.user_id] = {
        welcome_completed_at: o.welcome_completed_at,
        all_days_unlocked: daysSinceStart >= 29,
        days_unlocked: Math.min(daysSinceStart + 1, 30),
      };
    }
  });

  // Build stats map
  const progressMap = {};
  (progressData || []).forEach(p => {
    if (!progressMap[p.user_id]) {
      progressMap[p.user_id] = { completed: 0 };
    }
    if (p.completed) progressMap[p.user_id].completed++;
  });

  const quizMap = {};
  (quizData || []).forEach(q => {
    if (!quizMap[q.user_id]) {
      quizMap[q.user_id] = { passed: 0, total: 0 };
    }
    quizMap[q.user_id].total++;
    if (q.passed) quizMap[q.user_id].passed++;
  });

  const usersWithStats = users.map(u => ({
    ...u,
    days_completed: progressMap[u.id]?.completed || 0,
    quizzes_passed: quizMap[u.id]?.passed || 0,
    quizzes_taken: quizMap[u.id]?.total || 0,
    all_days_unlocked: onboardingMap[u.id]?.all_days_unlocked || false,
    days_unlocked: onboardingMap[u.id]?.days_unlocked || 0,
  }));

  return res.status(200).json({ users: usersWithStats });
}

async function handlePost(req, res, supabase, adminUser) {
  const { action, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Helper function to log admin actions
  const logAction = async (actionName, details = {}) => {
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        target_user_id: userId,
        action: actionName,
        details,
      });
    } catch (err) {
      logger.warn('Failed to log admin action:', err.message);
    }
  };

  if (action === 'unlock_all') {
    // Unlock all 30 days for the user
    // Set welcome_completed_at to 30 days ago so all days are unlocked
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .update({
        welcome_completed: true,
        welcome_completed_at: thirtyDaysAgo.toISOString(),
      })
      .eq('user_id', userId);

    if (onboardingError) {
      logger.error('Unlock all - onboarding error:', onboardingError);
      return res.status(500).json({ error: 'Failed to update onboarding: ' + onboardingError.message });
    }

    logger.log(`[ADMIN] Unlocked all days for user ${userId}`);
    return res.status(200).json({ success: true, message: 'All 30 days unlocked for user' });

  } else if (action === 'reset_user') {
    // Reset user - delete all progress data
    const errors = [];

    // Delete from challenge_progress
    const { error: progressError } = await supabase
      .from('challenge_progress')
      .delete()
      .eq('user_id', userId);
    if (progressError) errors.push('challenge_progress: ' + progressError.message);

    // Delete from quiz_attempts
    const { error: quizError } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('user_id', userId);
    if (quizError) errors.push('quiz_attempts: ' + quizError.message);

    // Delete from task_submissions
    const { error: taskError } = await supabase
      .from('task_submissions')
      .delete()
      .eq('user_id', userId);
    if (taskError) errors.push('task_submissions: ' + taskError.message);

    // Reset welcome_completed_at to restart the challenge timer
    // This determines when Day 1 unlocked and subsequent days unlock
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .update({
        welcome_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (onboardingError) errors.push('user_onboarding: ' + onboardingError.message);

    if (errors.length > 0) {
      logger.error('Reset user errors:', errors);
      return res.status(500).json({ error: 'Partial reset: ' + errors.join(', ') });
    }

    logger.log(`[ADMIN] Reset all progress for user ${userId}`);
    await logAction('reset_user', { userId });
    return res.status(200).json({ success: true, message: 'User progress reset successfully' });

  } else if (action === 'lock_all') {
    // Lock all days (set welcome_completed_at to now so only day 1 is unlocked)
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .update({
        welcome_completed: true,
        welcome_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (onboardingError) {
      logger.error('Lock all - onboarding error:', onboardingError);
      return res.status(500).json({ error: 'Failed to update onboarding: ' + onboardingError.message });
    }

    logger.log(`[ADMIN] Locked all days for user ${userId}`);
    await logAction('lock_all', { userId });
    return res.status(200).json({ success: true, message: 'All days locked (only day 1 accessible)' });

  } else if (action === 'suspend_user') {
    // Suspend user for specified duration
    const { durationDays, reason } = req.body;
    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + (parseInt(durationDays) || 7));

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        suspended_until: suspendedUntil.toISOString(),
        suspension_reason: reason || null,
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Suspended user ${userId} until ${suspendedUntil.toISOString()}`);
    await logAction('suspend_user', { suspended_until: suspendedUntil.toISOString(), reason });
    return res.status(200).json({ success: true, suspended_until: suspendedUntil.toISOString() });

  } else if (action === 'unsuspend_user') {
    // Remove suspension
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        suspended_until: null,
        suspension_reason: null,
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Unsuspended user ${userId}`);
    await logAction('unsuspend_user', { userId });
    return res.status(200).json({ success: true, message: 'User unsuspended successfully' });

  } else if (action === 'grant_paid_access') {
    // Grant paid access with expiry
    const { durationDays } = req.body;
    const accessExpires = new Date();
    accessExpires.setDate(accessExpires.getDate() + (parseInt(durationDays) || 120));

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        has_paid: true,
        paid_at: new Date().toISOString(),
        access_expires_at: accessExpires.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Ensure day 1 is unlocked
    await supabase.from('challenge_progress').upsert({
      user_id: userId,
      day: 1,
      unlocked: true,
    }, { onConflict: 'user_id,day' });

    logger.log(`[ADMIN] Granted paid access to user ${userId} until ${accessExpires.toISOString()}`);
    await logAction('grant_paid_access', { access_expires_at: accessExpires.toISOString(), duration_days: durationDays });
    return res.status(200).json({ success: true, access_expires_at: accessExpires.toISOString() });

  } else if (action === 'revoke_paid_access') {
    // Revoke paid access
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        has_paid: false,
        access_expires_at: null,
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Revoked paid access from user ${userId}`);
    await logAction('revoke_paid_access', { userId });
    return res.status(200).json({ success: true, message: 'Paid access revoked successfully' });

  } else if (action === 'extend_access') {
    // Extend access expiry by specified days
    const { extendDays } = req.body;

    // Get current access_expires_at
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('access_expires_at')
      .eq('id', userId)
      .single();

    let newExpiry;
    if (profile?.access_expires_at) {
      // Extend from current expiry
      newExpiry = new Date(profile.access_expires_at);
    } else {
      // No expiry set, extend from now
      newExpiry = new Date();
    }
    newExpiry.setDate(newExpiry.getDate() + (parseInt(extendDays) || 30));

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        access_expires_at: newExpiry.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Extended access for user ${userId} until ${newExpiry.toISOString()}`);
    await logAction('extend_access', { access_expires_at: newExpiry.toISOString(), extend_days: extendDays });
    return res.status(200).json({ success: true, access_expires_at: newExpiry.toISOString() });

  } else if (action === 'mark_paid') {
    // Manually mark as paid with reason
    const { reason } = req.body;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        has_paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Manually marked user ${userId} as paid. Reason: ${reason}`);
    await logAction('mark_paid', { reason });
    return res.status(200).json({ success: true, message: 'User marked as paid' });

  } else if (action === 'mark_unpaid') {
    // Manually mark as unpaid with reason
    const { reason } = req.body;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        has_paid: false,
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Manually marked user ${userId} as unpaid. Reason: ${reason}`);
    await logAction('mark_unpaid', { reason });
    return res.status(200).json({ success: true, message: 'User marked as unpaid' });

  } else if (action === 'reset_password') {
    // Send password reset email via Supabase
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return res.status(404).json({ error: 'User email not found' });
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    });

    if (resetError) {
      return res.status(500).json({ error: resetError.message });
    }

    logger.log(`[ADMIN] Sent password reset email to ${profile.email}`);
    await logAction('reset_password', { email: profile.email });
    return res.status(200).json({ success: true, message: 'Password reset email sent successfully' });

  } else if (action === 'refund_payment') {
    // Refund most recent payment and revoke access
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Get most recent successful payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, stripe_session_id, amount_cents, currency')
      .eq('user_id', userId)
      .eq('status', 'succeeded')
      .order('paid_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'No refundable payment found for this user' });
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

      // Get checkout session to find payment intent
      const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);

      if (!session.payment_intent) {
        return res.status(400).json({ error: 'Payment intent not found for this checkout session' });
      }

      // Create refund
      await stripe.refunds.create({
        payment_intent: session.payment_intent,
      });

      // Update payment status in database
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', payment.id);

      // Revoke paid access
      await supabase
        .from('user_profiles')
        .update({
          has_paid: false,
          access_expires_at: null,
        })
        .eq('id', userId);

      logger.log(`[ADMIN] Refunded payment ${payment.id} for user ${userId}`);
      await logAction('refund_payment', {
        payment_id: payment.id,
        amount: payment.amount_cents / 100,
        currency: payment.currency
      });
      return res.status(200).json({ success: true, message: 'Payment refunded and access revoked successfully' });

    } catch (stripeError) {
      logger.error('Stripe refund error:', stripeError);
      return res.status(500).json({ error: 'Stripe refund failed: ' + stripeError.message });
    }

  } else if (action === 'update_notes') {
    // Update admin notes for user
    const { notes } = req.body;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        admin_notes: notes || null,
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    logger.log(`[ADMIN] Updated admin notes for user ${userId}`);
    await logAction('update_notes', { notes_length: (notes || '').length });
    return res.status(200).json({ success: true, message: 'Admin notes updated successfully' });

  } else {
    return res.status(400).json({ error: 'Unknown action' });
  }
}

async function getUserDetails(res, supabase, userId) {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get onboarding data
  const { data: onboarding } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get challenge progress
  const { data: progress } = await supabase
    .from('challenge_progress')
    .select('*')
    .eq('user_id', userId)
    .order('day');

  // Get quiz attempts
  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  // Get task submissions
  const { data: taskSubmissions } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  // Get payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('paid_at', { ascending: false });

  // Get audit logs for this user
  const { data: auditLogs } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return res.status(200).json({
    profile,
    onboarding,
    progress: progress || [],
    quizAttempts: quizAttempts || [],
    taskSubmissions: taskSubmissions || [],
    payments: payments || [],
    auditLogs: auditLogs || [],
  });
}
