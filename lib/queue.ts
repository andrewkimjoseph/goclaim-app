import { Queue, type ConnectionOptions } from "bullmq";

/** Strip wrapping quotes Railway/console sometimes add to env vars. */
function cleanEnvUrl(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "");
}

/**
 * Upstash is TLS-only. Console sometimes shows redis:// — upgrade for *.upstash.io.
 */
function normalizeUpstashUrl(raw: string): string {
  const trimmed = cleanEnvUrl(raw);
  if (
    trimmed.startsWith("redis://") &&
    trimmed.includes("upstash.io")
  ) {
    console.warn(
      "[redis] UPSTASH_REDIS_URL uses redis:// — upgrading to rediss:// (Upstash requires TLS)"
    );
    return trimmed.replace(/^redis:\/\//, "rediss://");
  }
  return trimmed;
}

function parseUpstashRedisUrl(raw: string): ConnectionOptions {
  const trimmed = normalizeUpstashUrl(raw);

  if (trimmed.startsWith("https://")) {
    throw new Error(
      "UPSTASH_REDIS_URL must be the Redis TCP URL (rediss://default:...@....upstash.io:6379), not the REST API URL."
    );
  }

  if (!trimmed.startsWith("rediss://") && !trimmed.startsWith("redis://")) {
    throw new Error(
      "UPSTASH_REDIS_URL must start with rediss:// (Upstash requires TLS)."
    );
  }

  if (trimmed.startsWith("redis://") && !trimmed.includes("upstash.io")) {
    throw new Error(
      "UPSTASH_REDIS_URL uses redis:// without TLS. For Upstash, use rediss:// from the Connect tab."
    );
  }

  const parsed = new URL(trimmed);
  const useTls = parsed.protocol === "rediss:";
  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 6379;

  if (!host || !parsed.password) {
    throw new Error(
      "UPSTASH_REDIS_URL is malformed — copy the full rediss:// URL from Upstash → Redis → Connect."
    );
  }

  return {
    host,
    port,
    username: parsed.username || "default",
    password: decodeURIComponent(parsed.password),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 30_000,
    retryStrategy: (times) => {
      if (times > 20) return null;
      return Math.min(times * 500, 5_000);
    },
    reconnectOnError: (err) => {
      const msg = err.message;
      return (
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("READONLY")
      );
    },
    ...(useTls ? { tls: {} } : {}),
  };
}

export function getRedisConnection(): ConnectionOptions {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    throw new Error("Missing UPSTASH_REDIS_URL");
  }
  return parseUpstashRedisUrl(url);
}

export const CLAIM_QUEUE_NAME = "claimQueue";

let claimQueue: Queue | null = null;

export function getClaimQueue(): Queue {
  if (!claimQueue) {
    claimQueue = new Queue(CLAIM_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 600_000 },
        removeOnComplete: { count: 100, age: 86_400 },
        removeOnFail: { count: 50, age: 604_800 },
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

/** Log-safe host for startup diagnostics (no password). */
export function getRedisHostForLog(): string {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) return "(missing)";
  try {
    const parsed = new URL(normalizeUpstashUrl(url));
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || 6379}`;
  } catch {
    return "(invalid URL)";
  }
}
