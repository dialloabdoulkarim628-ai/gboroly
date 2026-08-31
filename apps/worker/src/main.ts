import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES } from './queues.js';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

/**
 * Phase 1 : squelette. Chaque queue a un worker no-op idempotent/retryable/observable.
 * Les processeurs réels (calendrier, PDF, notifications, outbox relay) arrivent aux phases dédiées.
 */
const workers = QUEUES.map(
  (name) =>
    new Worker(
      name,
      async (job) => {
        console.log(`[${name}] job ${job.id} reçu (no-op Phase 1)`);
        return { ok: true };
      },
      { connection, autorun: true },
    ),
);

console.log(`🟢 Gboroly worker démarré — ${workers.length} queues : ${QUEUES.join(', ')}`);

async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
