/**
 * Loops.so Email Integration
 *
 * Provides a server-side Loops client and helper functions for firing
 * milestone events and sending transactional emails.
 *
 * All automated emails are sent from status@mail.marketwarrior.club
 * via the Loops dashboard automations.
 */

import LoopsClient from 'loops';
import logger from './logger';

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client = null;

function getLoopsClient() {
  if (_client) return _client;

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    logger.error('[LOOPS] LOOPS_API_KEY is not configured');
    return null;
  }

  _client = new LoopsClient(apiKey);
  return _client;
}

// ---------------------------------------------------------------------------
// Event name map – milestones → Loops event strings
// ---------------------------------------------------------------------------

export const LOOPS_EVENTS = {
  // Registration / welcome
  CHALLENGE_WELCOME: 'challenge_welcome',

  // Phase progression
  PHASE_2_START: 'phase_2_start', // Day 8  – Technical Analysis
  PHASE_3_START: 'phase_3_start', // Day 15 – Advanced Strategies
  PHASE_4_START: 'phase_4_start', // Day 22 – Risk Management
  PHASE_5_START: 'phase_5_start', // Day 29 – Final Challenge

  // Completion
  CHALLENGE_COMPLETE: 'challenge_complete', // Day 30 final assessment

  // Maintenance / engagement
  USER_INACTIVE_7D: 'user_inactive_7d',
  ACCESS_EXPIRING: 'access_expiring',
};

// Map the first day of each phase to its event name
const PHASE_DAY_MAP = {
  8: LOOPS_EVENTS.PHASE_2_START,
  15: LOOPS_EVENTS.PHASE_3_START,
  22: LOOPS_EVENTS.PHASE_4_START,
  29: LOOPS_EVENTS.PHASE_5_START,
};

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a contact exists in Loops, then fire an event.
 *
 * @param {string} email  – The user's email address
 * @param {string} eventName – One of the LOOPS_EVENTS values
 * @param {object} [contactProperties] – Extra properties to set on the contact
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendLoopsEvent(email, eventName, contactProperties = {}) {
  const client = getLoopsClient();
  if (!client) {
    return { success: false, error: 'Loops client not configured' };
  }

  try {
    // Upsert contact first so the event is attached to a known contact
    await client.createContact({
      email,
      properties: {
        source: 'marketwarrior_app',
        ...contactProperties,
      },
    });
  } catch (err) {
    // 409 means contact exists – that's fine
    if (!String(err?.message ?? err).includes('409')) {
      logger.error('[LOOPS] Error upserting contact:', err?.message || err);
    }
  }

  try {
    const resp = await client.sendEvent({
      email,
      eventName,
      eventProperties: contactProperties,
    });

    logger.log(`[LOOPS] Event "${eventName}" sent to ${email}`, resp);
    return { success: true };
  } catch (err) {
    logger.error(`[LOOPS] Failed to send event "${eventName}" to ${email}:`, err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Fire a phase-start event if the newly unlocked day is the first day of a phase.
 *
 * Call this after a user completes a day and the next day gets unlocked.
 *
 * @param {string} email – The user's email
 * @param {number} unlockedDay – The day number that was just unlocked
 * @param {object} [extra] – Extra contact properties (e.g. firstName)
 */
export async function checkAndFirePhaseEvent(email, unlockedDay, extra = {}) {
  const eventName = PHASE_DAY_MAP[unlockedDay];
  if (!eventName) return; // Not a phase boundary

  return sendLoopsEvent(email, eventName, extra);
}

/**
 * Send a transactional email through Loops.
 * Used by the Admin "Send Broadcast" feature.
 *
 * @param {string} transactionalId – The Loops transactional email template ID
 * @param {string} email – Recipient email
 * @param {object} dataVariables – Template merge variables
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTransactionalEmail(transactionalId, email, dataVariables = {}) {
  const client = getLoopsClient();
  if (!client) {
    return { success: false, error: 'Loops client not configured' };
  }

  try {
    const resp = await client.sendTransactionalEmail({
      transactionalId,
      email,
      dataVariables,
    });

    logger.log(`[LOOPS] Transactional email "${transactionalId}" sent to ${email}`, resp);
    return { success: true };
  } catch (err) {
    logger.error(`[LOOPS] Transactional email failed for ${email}:`, err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}

export default getLoopsClient;
