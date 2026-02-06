/**
 * Tests for /api/cron/email-checks
 *
 * Validates:
 *  - Requires CRON_SECRET auth
 *  - 7-day inactivity check fires user_inactive_7d
 *  - 105-day expiration check fires access_expiring
 *  - GET only, rejects other methods
 */

import { createMocks } from 'node-mocks-http';

// Mock Supabase — build chainable mock
const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gte: jest.fn().mockResolvedValue({ data: [], error: null }),
  limit: jest.fn().mockReturnThis(),
};

const mockSupabaseFrom = jest.fn().mockReturnValue(mockChain);

jest.mock('../../lib/serverAuth', () => ({
  getServiceSupabase: () => ({ from: mockSupabaseFrom }),
}));

// Mock Loops — inline jest.fn() to avoid hoisting issues
jest.mock('../../lib/loops', () => ({
  sendLoopsEvent: jest.fn().mockResolvedValue({ success: true }),
  LOOPS_EVENTS: {
    USER_INACTIVE_7D: 'user_inactive_7d',
    ACCESS_EXPIRING: 'access_expiring',
  },
}));

// Mock rate limiting (always allow)
jest.mock('../../lib/ratelimit', () => ({
  rateLimiters: { general: {} },
  applyRateLimit: jest.fn().mockResolvedValue(null),
  getIdentifier: jest.fn().mockReturnValue('test-ip'),
}));

jest.mock('../../lib/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

import handler from '../../pages/api/cron/email-checks';
import { sendLoopsEvent } from '../../lib/loops';

describe('/api/cron/email-checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chain mocks
    Object.values(mockChain).forEach(fn => fn.mockClear());
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.not.mockReturnValue(mockChain);
    mockChain.lte.mockReturnValue(mockChain);
    mockChain.gte.mockResolvedValue({ data: [], error: null });
    sendLoopsEvent.mockResolvedValue({ success: true });
  });

  it('rejects non-GET methods', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('rejects missing Authorization header', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {},
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('rejects wrong CRON_SECRET', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('succeeds with correct CRON_SECRET and no matching users', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.inactivityNotifications).toBe(0);
    expect(body.expirationNotifications).toBe(0);
  });

  it('fires user_inactive_7d for users inactive exactly 7 days', async () => {
    let gteCallCount = 0;
    mockChain.gte.mockImplementation(() => {
      gteCallCount++;
      if (gteCallCount === 1) {
        // Inactivity query result
        return { data: [{ id: 'user-1', email: 'inactive@test.com', last_login: '2026-01-30T00:00:00Z' }], error: null };
      }
      // Expiration query result
      return { data: [], error: null };
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(sendLoopsEvent).toHaveBeenCalledWith(
      'inactive@test.com',
      'user_inactive_7d',
      expect.objectContaining({ userId: 'user-1' })
    );
  });

  it('fires access_expiring for users at 105 days since payment', async () => {
    let gteCallCount = 0;
    mockChain.gte.mockImplementation(() => {
      gteCallCount++;
      if (gteCallCount === 1) {
        // Inactivity query - empty
        return { data: [], error: null };
      }
      // Expiration query - found a user
      return {
        data: [{
          id: 'user-2',
          email: 'expiring@test.com',
          paid_at: '2025-10-24T00:00:00Z',
          access_expires_at: null,
        }],
        error: null,
      };
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(sendLoopsEvent).toHaveBeenCalledWith(
      'expiring@test.com',
      'access_expiring',
      expect.objectContaining({ userId: 'user-2' })
    );
  });
});
