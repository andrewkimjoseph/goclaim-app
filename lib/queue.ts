import { Queue, type ConnectionOptions } from "bullmq";

function getConnection(): ConnectionOptions {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    throw new Error("Missing UPSTASH_REDIS_URL");
  }
  return {
    url,
    maxRetriesPerRequest: null,
    tls: url.startsWith("rediss://") ? {} : undefined,
  };
}

export const CLAIM_QUEUE_NAME = "claimQueue";

let claimQueue: Queue | null = null;

export function getClaimQueue(): Queue {
  if (!claimQueue) {
    claimQueue = new Queue(CLAIM_QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 600_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return claimQueue;
}

export type ClaimJobData = {
  userId: string;
  waveIndex?: number;
};

export const WAVE_SIZE = 50;
export const INTER_WAVE_DELAY_MS = 2000;

export async function enqueueClaimWaves(userIds: string[]): Promise<{
  enqueued: number;
  waves: number;
}> {
  const queue = getClaimQueue();
  const waves: string[][] = [];
  for (let i = 0; i < userIds.length; i += WAVE_SIZE) {
    waves.push(userIds.slice(i, i + WAVE_SIZE));
  }

  let enqueued = 0;
  for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
    const wave = waves[waveIndex];
    await queue.addBulk(
      wave.map((userId) => ({
        name: "process-claim",
        data: { userId, waveIndex } satisfies ClaimJobData,
      }))
    );
    enqueued += wave.length;
    if (waveIndex < waves.length - 1) {
      await new Promise((r) => setTimeout(r, INTER_WAVE_DELAY_MS));
    }
  }

  return { enqueued, waves: waves.length };
}

export { getConnection as getRedisConnection };
