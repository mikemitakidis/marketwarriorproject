// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: SENTRY_ENVIRONMENT,

  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (SENTRY_ENVIRONMENT === 'development' && !process.env.SENTRY_ENABLE_IN_DEV) {
      return null;
    }
    return event;
  },
});
