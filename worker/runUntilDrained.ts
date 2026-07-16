import "../lib/loadEnv";
import { getClaimQueue, getRedisHostForLog } from "../lib/queue";
import { createClaimWorker } from "./createClaimWorker";
import { getWorkerTuning } from "./workerConfig";

const tuning = getWorkerTuning();
let shuttingDown = false;

const worker = createClaimWorker({ drainDelay: 5 });

async function pendingJobCount(): Promise<number> {
  const queue = getClaimQueue();
  const counts = await queue.getJobCounts("wait", "active", "delayed");
  return counts.wait + counts.active + counts.delayed;
}

async function shutdown(exitCode: number) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[worker:drain] shutting down (exit ${exitCode})`);
  clearTimeout(maxRunTimer);

  try {
    await worker.close();
    await getClaimQueue().close();
  } catch (err) {
    console.error("[worker:drain] error during shutdown:", err);
  }

  process.exit(exitCode);
}

async function checkQueueDrained() {
  if (shuttingDown) return;

  const pending = await pendingJobCount();
  if (pending === 0) {
    console.log("[worker:drain] queue empty — all jobs processed");
    await shutdown(0);
  }
}

worker.on("drained", () => {
  void checkQueueDrained();
});

worker.on("completed", () => {
  void checkQueueDrained();
});

worker.on("failed", () => {
  void checkQueueDrained();
});

const maxRunTimer = setTimeout(() => {
  console.error(
    `[worker:drain] exceeded WORKER_MAX_RUN_MS (${tuning.maxRunMs}ms) — exiting`
  );
  void shutdown(1);
}, tuning.maxRunMs);

if (
  process.env.NODE_ENV === "development" &&
  getRedisHostForLog().includes("upstash.io")
) {
  console.warn(
    "[worker:drain] Running against Upstash. Prefer production cron or `npm run claim-test` for single claims."
  );
}

process.on("SIGTERM", () => {
  console.log("[worker:drain] SIGTERM received");
  void shutdown(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("[worker:drain] unhandled rejection:", reason);
});

console.log(
  `[worker:drain] waiting for queue to drain (max run ${tuning.maxRunMs}ms)`
);
