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
    // Always log errors, but sanitize in production
    if (isDev) {
      console.error(...args);
    } else {
      // In production, log errors but strip sensitive details
      console.error('Error occurred:', args[0]);
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
