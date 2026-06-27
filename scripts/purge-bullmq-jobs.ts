/**
 * One-time cleanup of stale BullMQ job records in Redis.
 * Claim audit history lives in Postgres (ClaimLog) — safe to purge Redis jobs.
 *
 * Usage: npm run queue:purge
 * Do not run while jobs are in-flight.
 */
import { getClaimQueue } from "@/lib/queue";

async function cleanAll(status: "completed" | "failed") {
  const queue = getClaimQueue();
  let total = 0;

  while (true) {
    const removed = await queue.clean(0, 1000, status);
    total += removed.length;
    if (removed.length < 1000) break;
  }

  return total;
}

async function main() {
  const completed = await cleanAll("completed");
  const failed = await cleanAll("failed");

  console.log(
    `[queue:purge] removed ${completed} completed and ${failed} failed job records from Redis`
  );

  await getClaimQueue().close();
}

main().catch((err) => {
  console.error("[queue:purge] failed:", err);
  process.exit(1);
});
