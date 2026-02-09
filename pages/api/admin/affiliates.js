import logger from '../../../lib/logger';

/**
 * DEPRECATED & DISABLED — OLD CUSTOM AFFILIATE SYSTEM
 *
 * This endpoint was part of the original custom-built affiliate system.
 * All affiliate tracking is now handled by PromoteKit (3rd party).
 * PromoteKit handles: referral codes, commission tracking, self-referral prevention, refunds.
 *
 * This endpoint returns a clear message directing admins to the PromoteKit dashboard.
 */
export default async function handler(req, res) {
  logger.log('[AFFILIATES] Old custom affiliate endpoint called - redirecting to PromoteKit');

  return res.status(200).json({
    message: 'The custom affiliate system has been replaced by PromoteKit.',
    info: 'All affiliate tracking, commissions, and payouts are managed via the PromoteKit dashboard.',
    promotekit_dashboard: 'https://dashboard.promotekit.com',
    deprecated: true,
  });
}
