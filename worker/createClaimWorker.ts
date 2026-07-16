import { Worker, type WorkerOptions } from "bullmq";
import { CLAIM_QUEUE_NAME, getRedisHostForLog } from "../lib/queue";
import { processClaim } from "./jobs/processClaim";
import { getWorkerOptions, getWorkerTuning } from "./workerConfig";

export function createClaimWorker(options?: Partial<WorkerOptions>) {
  const tuning = getWorkerTuning();
  const worker = new Worker(
    CLAIM_QUEUE_NAME,
    async (job) => {
      await processClaim(job.data);
    },
    getWorkerOptions(options)
  );

  worker.on("ready", () => {
    console.log(`[worker] Redis connected (${getRedisHostForLog()})`);
  });

  worker.on("error", (err) => {
    console.error("[worker] Redis error:", err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[worker] completed job ${job.id} for user ${job.data.userId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[worker] failed job ${job?.id} for user ${job?.data.userId}:`,
      err.message
    );
  });

  console.log(
    `[worker] starting (redis: ${getRedisHostForLog()}, concurrency: ${tuning.concurrency}, drainDelay: ${options?.drainDelay ?? tuning.drainDelay}s, lockDuration: ${tuning.lockDuration}ms)`
  );

  return worker;
}
