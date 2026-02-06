/**
 * Tests for /api/admin/test-loops
 *
 * Validates:
 *  - Requires admin auth
 *  - Validates eventName against known events
 *  - Fires the event via sendLoopsEvent
 *  - Returns proper success/error responses
 */

import { createMocks } from 'node-mocks-http';

// Mock serverAuth
jest.mock('../../lib/serverAuth', () => ({
  getUserFromRequest: jest.fn(),
  verifyAdminAccess: jest.fn(),
  getServiceSupabase: jest.fn(),
}));

// Mock Loops — use inline jest.fn() to avoid hoisting issues
jest.mock('../../lib/loops', () => ({
  sendLoopsEvent: jest.fn().mockResolvedValue({ success: true }),
  LOOPS_EVENTS: {
    CHALLENGE_WELCOME: 'challenge_welcome',
    PHASE_2_START: 'phase_2_start',
    PHASE_3_START: 'phase_3_start',
    PHASE_4_START: 'phase_4_start',
    PHASE_5_START: 'phase_5_start',
    CHALLENGE_COMPLETE: 'challenge_complete',
    USER_INACTIVE_7D: 'user_inactive_7d',
    ACCESS_EXPIRING: 'access_expiring',
  },
}));

// Mock rate limiting
jest.mock('../../lib/ratelimit', () => ({
  rateLimiters: { admin: {} },
  applyRateLimit: jest.fn().mockResolvedValue(null),
  getIdentifier: jest.fn().mockReturnValue('test-user'),
}));

jest.mock('../../lib/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

import handler from '../../pages/api/admin/test-loops';
import { getUserFromRequest, verifyAdminAccess } from '../../lib/serverAuth';
import { sendLoopsEvent } from '../../lib/loops';

describe('/api/admin/test-loops', () => {
  const adminUser = { id: 'admin-1', email: 'admin@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    getUserFromRequest.mockResolvedValue(adminUser);
    verifyAdminAccess.mockResolvedValue(true);
    sendLoopsEvent.mockResolvedValue({ success: true });
  });

  it('rejects non-POST methods', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('rejects unauthenticated users', async () => {
    getUserFromRequest.mockResolvedValue(null);
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'test@test.com', eventName: 'challenge_welcome' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('rejects non-admin users', async () => {
    verifyAdminAccess.mockResolvedValue(false);
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'test@test.com', eventName: 'challenge_welcome' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('rejects invalid eventName', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'test@test.com', eventName: 'fake_event' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.validEvents).toContain('challenge_welcome');
  });

  it('rejects missing email', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { eventName: 'challenge_welcome' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('fires event successfully for all valid event names', async () => {
    const validEvents = [
      'challenge_welcome', 'phase_2_start', 'phase_3_start',
      'phase_4_start', 'phase_5_start', 'challenge_complete',
      'user_inactive_7d', 'access_expiring',
    ];

    for (const eventName of validEvents) {
      sendLoopsEvent.mockClear();

      const { req, res } = createMocks({
        method: 'POST',
        body: { email: 'test@test.com', eventName },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);

      const body = JSON.parse(res._getData());
      expect(body.success).toBe(true);
      expect(body.event).toBe(eventName);
      expect(sendLoopsEvent).toHaveBeenCalledWith(
        'test@test.com',
        eventName,
        expect.objectContaining({ testMode: true })
      );
    }
  });
});
