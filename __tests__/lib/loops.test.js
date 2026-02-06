/**
 * Tests for lib/loops.js — Loops.so email integration
 *
 * Validates:
 *  - Client initialization from env var
 *  - Event name mapping (all 8 events exist)
 *  - sendLoopsEvent creates contact then fires event
 *  - checkAndFirePhaseEvent only fires on phase boundaries (8,15,22,29)
 *  - sendTransactionalEmail passes correct params
 *  - Graceful behavior when API key is missing
 */

// Mock the loops SDK before importing our code
const mockCreateContact = jest.fn().mockResolvedValue({ success: true, id: 'contact-123' });
const mockSendEvent = jest.fn().mockResolvedValue({ success: true });
const mockSendTransactionalEmail = jest.fn().mockResolvedValue({ success: true });
const mockTestApiKey = jest.fn().mockResolvedValue({ success: true, teamName: 'Test' });

jest.mock('loops', () => {
  return jest.fn().mockImplementation(() => ({
    createContact: mockCreateContact,
    sendEvent: mockSendEvent,
    sendTransactionalEmail: mockSendTransactionalEmail,
    testApiKey: mockTestApiKey,
  }));
});

import LoopsClient from 'loops';
import getLoopsClient, {
  LOOPS_EVENTS,
  sendLoopsEvent,
  checkAndFirePhaseEvent,
  sendTransactionalEmail,
} from '../../lib/loops';

describe('lib/loops.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton so each test gets a fresh client
    // We need to clear the module-level _client variable
    jest.resetModules();
  });

  // -----------------------------------------------------------------------
  // LOOPS_EVENTS map
  // -----------------------------------------------------------------------
  describe('LOOPS_EVENTS', () => {
    it('contains all 8 required event names', () => {
      expect(LOOPS_EVENTS.CHALLENGE_WELCOME).toBe('challenge_welcome');
      expect(LOOPS_EVENTS.PHASE_2_START).toBe('phase_2_start');
      expect(LOOPS_EVENTS.PHASE_3_START).toBe('phase_3_start');
      expect(LOOPS_EVENTS.PHASE_4_START).toBe('phase_4_start');
      expect(LOOPS_EVENTS.PHASE_5_START).toBe('phase_5_start');
      expect(LOOPS_EVENTS.CHALLENGE_COMPLETE).toBe('challenge_complete');
      expect(LOOPS_EVENTS.USER_INACTIVE_7D).toBe('user_inactive_7d');
      expect(LOOPS_EVENTS.ACCESS_EXPIRING).toBe('access_expiring');
    });

    it('has exactly 8 events', () => {
      expect(Object.keys(LOOPS_EVENTS)).toHaveLength(8);
    });
  });

  // -----------------------------------------------------------------------
  // sendLoopsEvent
  // -----------------------------------------------------------------------
  describe('sendLoopsEvent', () => {
    it('creates a contact and fires the event', async () => {
      const result = await sendLoopsEvent('student@test.com', 'challenge_welcome', { userId: 'u-1' });

      expect(result.success).toBe(true);

      // Verify createContact was called with correct object shape
      expect(mockCreateContact).toHaveBeenCalledWith({
        email: 'student@test.com',
        properties: {
          source: 'marketwarrior_app',
          userId: 'u-1',
        },
      });

      // Verify sendEvent was called with correct params
      expect(mockSendEvent).toHaveBeenCalledWith({
        email: 'student@test.com',
        eventName: 'challenge_welcome',
        eventProperties: { userId: 'u-1' },
      });
    });

    it('still fires event if createContact throws (contact already exists)', async () => {
      mockCreateContact.mockRejectedValueOnce(new Error('409 Contact already exists'));

      const result = await sendLoopsEvent('existing@test.com', 'phase_2_start');

      expect(result.success).toBe(true);
      expect(mockSendEvent).toHaveBeenCalledTimes(1);
    });

    it('returns error if sendEvent throws', async () => {
      mockSendEvent.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendLoopsEvent('student@test.com', 'challenge_welcome');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('returns error when LOOPS_API_KEY is not set', async () => {
      const originalKey = process.env.LOOPS_API_KEY;
      delete process.env.LOOPS_API_KEY;

      // Re-import to get a fresh module without the cached client
      jest.resetModules();
      jest.mock('loops', () => {
        return jest.fn().mockImplementation(() => ({
          createContact: mockCreateContact,
          sendEvent: mockSendEvent,
          sendTransactionalEmail: mockSendTransactionalEmail,
        }));
      });

      const freshModule = require('../../lib/loops');
      const result = await freshModule.sendLoopsEvent('test@test.com', 'challenge_welcome');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Loops client not configured');

      process.env.LOOPS_API_KEY = originalKey;
    });
  });

  // -----------------------------------------------------------------------
  // checkAndFirePhaseEvent
  // -----------------------------------------------------------------------
  describe('checkAndFirePhaseEvent', () => {
    it('fires phase_2_start when day 8 is unlocked', async () => {
      await checkAndFirePhaseEvent('s@test.com', 8);

      expect(mockSendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'phase_2_start' })
      );
    });

    it('fires phase_3_start when day 15 is unlocked', async () => {
      await checkAndFirePhaseEvent('s@test.com', 15);

      expect(mockSendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'phase_3_start' })
      );
    });

    it('fires phase_4_start when day 22 is unlocked', async () => {
      await checkAndFirePhaseEvent('s@test.com', 22);

      expect(mockSendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'phase_4_start' })
      );
    });

    it('fires phase_5_start when day 29 is unlocked', async () => {
      await checkAndFirePhaseEvent('s@test.com', 29);

      expect(mockSendEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'phase_5_start' })
      );
    });

    it('does NOT fire for non-phase-boundary days', async () => {
      // These days are NOT phase boundaries — no event should fire
      for (const day of [1, 2, 5, 7, 9, 10, 14, 16, 20, 21, 23, 28, 30]) {
        mockSendEvent.mockClear();
        await checkAndFirePhaseEvent('s@test.com', day);
        expect(mockSendEvent).not.toHaveBeenCalled();
      }
    });
  });

  // -----------------------------------------------------------------------
  // sendTransactionalEmail
  // -----------------------------------------------------------------------
  describe('sendTransactionalEmail', () => {
    it('calls client.sendTransactionalEmail with correct params', async () => {
      const result = await sendTransactionalEmail('tmpl-123', 'user@test.com', {
        subject: 'Test',
        body: 'Hello',
        firstName: 'Mike',
      });

      expect(result.success).toBe(true);
      expect(mockSendTransactionalEmail).toHaveBeenCalledWith({
        transactionalId: 'tmpl-123',
        email: 'user@test.com',
        dataVariables: {
          subject: 'Test',
          body: 'Hello',
          firstName: 'Mike',
        },
      });
    });

    it('returns error when transactional email fails', async () => {
      mockSendTransactionalEmail.mockRejectedValueOnce(new Error('Template not found'));

      const result = await sendTransactionalEmail('bad-tmpl', 'user@test.com', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template not found');
    });
  });
});
