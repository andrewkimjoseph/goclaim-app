import { Worker } from "bullmq";
import { CLAIM_QUEUE_NAME, getRedisConnection } from "@/lib/queue";
import { processClaim } from "./jobs/processClaim";

const worker = new Worker(
  CLAIM_QUEUE_NAME,
  async (job) => {
    await processClaim(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: 50,
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] completed job ${job.id} for user ${job.data.userId}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[worker] failed job ${job?.id} for user ${job?.data.userId}:`,
    err.message
  );
});

console.log("[worker] GoClaim claim worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
