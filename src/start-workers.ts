// Script to start all background workers
// Run with: npx ts-node src/start-workers.ts

import './workers/index';

console.log('[WORKERS] Worker processes started successfully');
console.log('[WORKERS] Press Ctrl+C to stop');

// Keep the process running
setInterval(() => {
  // Health check - workers are running
}, 5000);
