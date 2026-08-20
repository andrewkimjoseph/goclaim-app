/**
 * Enqueue all active claims via prod trigger-claims, then drain locally.
 *
 * Usage: npm run worker:trigger-drain
 *
 * Requires CRON_SECRET (+ worker env: UPSTASH_REDIS_URL, DATABASE_URL, etc.)
 * Override base URL with NEXT_PUBLIC_APP_URL or APP_URL if needed.
 */
import "@/lib/loadEnv";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const DEFAULT_APP_URL = "https://app.goclaim.xyz";

async function enqueueClaims(): Promise<void> {
  const baseUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_APP_URL
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is not set (check .env.local)");
  }

  // Prefer prod for this script unless APP_URL is set; ignore localhost default.
  const url =
    baseUrl.includes("localhost") && !process.env.APP_URL
      ? `${DEFAULT_APP_URL}/api/internal/trigger-claims`
      : `${baseUrl}/api/internal/trigger-claims`;

  console.log(`[trigger-and-drain] POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`[trigger-and-drain] ${res.status} ${body}`);

  if (!res.ok) {
    throw new Error(`trigger-claims failed with HTTP ${res.status}`);
  }

  let parsed: { enqueued?: number } | null = null;
  try {
    parsed = JSON.parse(body) as { enqueued?: number };
  } catch {
    /* non-JSON is still ok if status was 2xx */
  }
  if (parsed?.enqueued === 0) {
    console.log("[trigger-and-drain] nothing enqueued — skipping drain");
    process.exit(0);
  }
}

function runDrain(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const entry = resolve(process.cwd(), "worker/runUntilDrained.ts");
    const child = spawn("node_modules/.bin/tsx", [entry], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`drain exited from signal ${signal}`));
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

async function main() {
  await enqueueClaims();
  console.log("[trigger-and-drain] starting worker:drain");
  const code = await runDrain();
  process.exit(code);
}

main().catch((err) => {
  console.error("[trigger-and-drain] failed:", err);
  process.exit(1);
});
