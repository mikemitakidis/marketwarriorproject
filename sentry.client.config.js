// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,

  // Sample 10% of transactions in production to stay within Sentry free tier limits
  // (100% = every page load sends data = burns through quota fast + slows site)
  tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture 50% of error replay sessions (enough to diagnose issues without excessive cost)
  replaysOnErrorSampleRate: 0.5,

  // Sample 1% of normal sessions for general monitoring
  replaysSessionSampleRate: 0.01,

  environment: SENTRY_ENVIRONMENT,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps

  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (SENTRY_ENVIRONMENT === 'development' && !process.env.NEXT_PUBLIC_SENTRY_ENABLE_IN_DEV) {
      return null;
    }
    return event;
  },
});
