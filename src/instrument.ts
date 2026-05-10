import 'dotenv/config';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

console.log('[SENTRY] Loading instrumentation with DSN:', process.env.SENTRY_DSN ? 'FOUND' : 'MISSING');

try {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.expressIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, 

    // Profiling
    profilesSampleRate: 1.0, 

    // PII
    sendDefaultPii: true,
  });
  console.log('[SENTRY] SDK Initialized Successfully');
} catch (error) {
  console.error('[SENTRY] Failed to initialize SDK:', error);
}
