import "@/lib/loadEnv";
import { getRedisHostForLog } from "../lib/queue";
import { createClaimWorker } from "./createClaimWorker";

if (
  process.env.NODE_ENV === "development" &&
  getRedisHostForLog().includes("upstash.io")
) {
  console.warn(
    "[worker] Running in development against Upstash — this adds idle Redis polling. Prefer `npm run claim-test` unless testing the queue."
  );
}

const worker = createClaimWorker();

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandled rejection:", reason);
});
