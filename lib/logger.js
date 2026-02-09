/**
 * Development-only logger
 * Prevents sensitive data from being logged in production
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },

  error: (...args) => {
    // Always log errors - include message and stack trace for debugging
    if (isDev) {
      console.error(...args);
    } else {
      // In production, log first arg (message) plus any Error stack traces
      const parts = [args[0]];
      for (let i = 1; i < args.length; i++) {
        if (args[i] instanceof Error) {
          parts.push(args[i].message);
          if (args[i].stack) parts.push(args[i].stack);
        } else if (typeof args[i] === 'string') {
          parts.push(args[i]);
        }
      }
      console.error(...parts);
    }
  },

  warn: (...args) => {
    if (isDev) console.warn(...args);
  },

  info: (...args) => {
    if (isDev) console.info(...args);
  },
};

export default logger;
