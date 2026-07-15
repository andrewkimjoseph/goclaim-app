/**
 * Debug: probe Neon reachability + prisma migrate deploy timing.
 * Run: node --env-file=.env.local scripts/debug-db-reachability.mjs
 */
import { spawnSync } from "node:child_process";
import dns from "node:dns/promises";
import net from "node:net";
import { writeFileSync, appendFileSync } from "node:fs";

const INGEST =
  "http://127.0.0.1:7806/ingest/49e065e2-1b6a-4303-b7b7-85f060a98273";
const LOG_PATH = "/Users/andi/celina/.cursor/debug-5448f0.log";
const SESSION = "5448f0";

function log(hypothesisId, location, message, data) {
  const payload = {
    sessionId: SESSION,
    runId: process.env.DEBUG_RUN_ID || "pre-fix",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  try {
    appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore */
  }
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
  console.log(`[${hypothesisId}] ${message}`, data);
}

function hostFromDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return { hostname: u.hostname, port: Number(u.port || 5432), protocol: u.protocol };
  } catch (e) {
    return { error: String(e) };
  }
}

async function tcpProbe(hostname, port, timeoutMs = 8000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = net.connect({ host: hostname, port });
    const done = (ok, err) => {
      socket.destroy();
      resolve({ ok, ms: Date.now() - started, err: err ? String(err.message || err) : null });
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false, new Error("tcp_timeout")));
    socket.on("error", (err) => done(false, err));
  });
}

const databaseUrl = process.env.DATABASE_URL;
log("H2", "debug-db-reachability.mjs:env", "DATABASE_URL present?", {
  present: Boolean(databaseUrl),
  length: databaseUrl?.length ?? 0,
});

if (!databaseUrl) {
  log("H2", "debug-db-reachability.mjs:env", "Missing DATABASE_URL — abort", {});
  process.exit(1);
}

const parsed = hostFromDatabaseUrl(databaseUrl);
log("H2", "debug-db-reachability.mjs:parse", "Parsed DATABASE_URL host", {
  hostname: parsed.hostname,
  port: parsed.port,
  isPooler: Boolean(parsed.hostname?.includes("-pooler")),
  isDawnScene: Boolean(parsed.hostname?.includes("ep-dawn-scene-at40jek3")),
});

let dnsResult = null;
try {
  dnsResult = await dns.lookup(parsed.hostname, { all: true });
  log("H1", "debug-db-reachability.mjs:dns", "DNS lookup ok", {
    addresses: dnsResult.map((a) => ({ address: a.address, family: a.family })),
  });
} catch (e) {
  log("H1", "debug-db-reachability.mjs:dns", "DNS lookup failed", {
    error: String(e.message || e),
  });
}

const tcp = await tcpProbe(parsed.hostname, parsed.port);
log("H1", "debug-db-reachability.mjs:tcp", "TCP probe to :5432", tcp);

const migrateStarted = Date.now();
const migrate = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy"],
  {
    cwd: new URL("..", import.meta.url).pathname,
    env: process.env,
    encoding: "utf8",
  },
);
log("H3", "debug-db-reachability.mjs:migrate", "prisma migrate deploy finished", {
  status: migrate.status,
  ms: Date.now() - migrateStarted,
  stdoutTail: (migrate.stdout || "").slice(-500),
  stderrTail: (migrate.stderr || "").slice(-800),
});

log("H5", "debug-db-reachability.mjs:buildcmd", "vercel buildCommand includes migrate deploy", {
  vercelBuildCommand:
    "prisma generate && prisma migrate deploy && next build",
  packageBuildCommand: "prisma generate && next build",
  mismatch: true,
});

process.exit(migrate.status === 0 ? 0 : 1);
