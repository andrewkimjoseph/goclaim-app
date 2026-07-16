import type { WorkerOptions } from "bullmq";
import { getRedisConnection } from "../lib/queue";

export function getWorkerTuning() {
  return {
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? "5"),
    drainDelay: Number(process.env.WORKER_DRAIN_DELAY_SEC ?? "120"),
    lockDuration: Number(process.env.WORKER_LOCK_DURATION_MS ?? "120000"),
    lockRenewTime: Number(process.env.WORKER_LOCK_RENEW_MS ?? "60000"),
    maxRunMs: Number(process.env.WORKER_MAX_RUN_MS ?? "3600000"),
  };
}

export function getWorkerOptions(
  overrides?: Partial<WorkerOptions>
): WorkerOptions {
  const tuning = getWorkerTuning();
  return {
    connection: getRedisConnection(),
    concurrency: tuning.concurrency,
    drainDelay: tuning.drainDelay,
    lockDuration: tuning.lockDuration,
    lockRenewTime: tuning.lockRenewTime,
    ...overrides,
  };
}
