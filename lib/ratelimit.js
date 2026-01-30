import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import logger from './logger';

// In-memory store for development (when Upstash is not configured)
class MemoryStore {
  constructor() {
    this.hits = new Map();
  }

  async get(key) {
    const data = this.hits.get(key);
    if (!data) return null;

    // Clean up expired entries
    if (data.reset < Date.now()) {
      this.hits.delete(key);
      return null;
    }

    return data;
  }

  async set(key, data) {
    this.hits.set(key, data);
  }
}

const memoryStore = new MemoryStore();

// Create rate limiters with different limits for different endpoint types
function createRateLimiter(requests, window) {
  // Use Upstash Redis if configured, otherwise use in-memory store
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    const redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: 'marketwarrior',
    });
  } else {
    // Development mode: in-memory rate limiting
    return {
      async limit(identifier) {
        const key = `ratelimit:${identifier}`;
        const now = Date.now();
        const windowMs = typeof window === 'string' ? parseWindow(window) : window;

        const data = await memoryStore.get(key);

        if (!data) {
          const reset = now + windowMs;
          await memoryStore.set(key, { count: 1, reset });
          return { success: true, limit: requests, remaining: requests - 1, reset };
        }

        if (data.count >= requests) {
          return { success: false, limit: requests, remaining: 0, reset: data.reset };
        }

        data.count++;
        await memoryStore.set(key, data);
        return { success: true, limit: requests, remaining: requests - data.count, reset: data.reset };
      }
    };
  }
}

// Helper to parse window strings like "10 s" or "1 m"
function parseWindow(window) {
  const match = window.match(/(\d+)\s*([smhd])/);
  if (!match) return 10000; // default 10 seconds

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  return value * (multipliers[unit] || 1000);
}

// Different rate limiters for different endpoint types
export const rateLimiters = {
  // Auth endpoints: 5 requests per 10 seconds per IP
  auth: createRateLimiter(5, '10 s'),

  // Payment endpoints: 3 requests per minute per IP
  payment: createRateLimiter(3, '1 m'),

  // Admin endpoints: 30 requests per minute per IP
  admin: createRateLimiter(30, '1 m'),

  // Quiz/Task submission: 10 requests per minute per user
  submission: createRateLimiter(10, '1 m'),

  // File upload: 5 uploads per 5 minutes per user
  upload: createRateLimiter(5, '5 m'),

  // General API: 60 requests per minute per IP
  general: createRateLimiter(60, '1 m'),

  // Journal/Trading API: 60 requests per minute per IP
  api: createRateLimiter(60, '1 m'),
};

// Middleware to apply rate limiting
export async function applyRateLimit(req, res, limiter, identifier) {
  try {
    const result = await limiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.reset);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter,
      });
    }

    return null; // Success, continue processing
  } catch (error) {
    // If rate limiting fails, log but don't block the request
    logger.error('Rate limiting error:', error);
    return null;
  }
}

// Helper to get identifier from request (IP or user ID)
export function getIdentifier(req, userId = null) {
  if (userId) return `user:${userId}`;

  // Get IP from various headers (for proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

  return `ip:${ip}`;
}
