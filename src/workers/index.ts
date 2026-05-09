// Workers entry point
// Import this file to start all workers

import { emailWorker } from './email.worker';
import { aiWorker } from './ai.worker';
import { analyticsWorker } from './analytics.worker';

console.log('[WORKERS] All workers initialized');

export { emailWorker, aiWorker, analyticsWorker };

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WORKERS] SIGTERM received, closing workers...');
  await emailWorker.close();
  await aiWorker.close();
  await analyticsWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WORKERS] SIGINT received, closing workers...');
  await emailWorker.close();
  await aiWorker.close();
  await analyticsWorker.close();
  process.exit(0);
});
