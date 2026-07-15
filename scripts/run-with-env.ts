/**
 * Run a CLI with .env / .env.local loaded (Prisma only reads `.env` by default).
 *
 * Usage:
 *   tsx scripts/run-with-env.ts prisma migrate deploy
 *   npm run db:deploy
 */
import "@/lib/loadEnv";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx scripts/run-with-env.ts <command> [...args]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Add it to .env.local (or export it) and retry."
  );
  process.exit(1);
}

const [command, ...commandArgs] = args;
const result = spawnSync(command, commandArgs, {
  stdio: "inherit",
  env: process.env,
    shell: false,
});

process.exit(result.status ?? 1);
