// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: SENTRY_ENVIRONMENT,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps

  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (SENTRY_ENVIRONMENT === 'development' && !process.env.SENTRY_ENABLE_IN_DEV) {
      return null;
    }

    // Filter out sensitive data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['stripe-signature'];
      }

      // Remove sensitive query parameters
      if (event.request.query_string) {
        event.request.query_string = event.request.query_string
          .replace(/password=[^&]*/gi, 'password=[FILTERED]')
          .replace(/token=[^&]*/gi, 'token=[FILTERED]')
          .replace(/api_key=[^&]*/gi, 'api_key=[FILTERED]');
      }
    }

    // Remove sensitive data from extra context
    if (event.extra) {
      delete event.extra.password;
      delete event.extra.token;
      delete event.extra.apiKey;
      delete event.extra.stripe_secret_key;
    }

    return event;
  },
});
