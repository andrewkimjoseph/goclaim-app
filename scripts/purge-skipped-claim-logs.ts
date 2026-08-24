/**
 * Delete ClaimLog rows with status "skipped" (and child transfer/event logs).
 * Useful after duplicate cron runs that logged already_claimed skips.
 *
 * Usage:
 *   npm run purge:skipped-claim-logs
 *   DRY_RUN=1 npm run purge:skipped-claim-logs
 *   npm run purge:skipped-claim-logs -- 24-08-2026
 *   CLAIMED_DATE=24-08-2026 npm run purge:skipped-claim-logs
 *   CLAIMED_DATE=2026-08-24 npm run purge:skipped-claim-logs
 *
 * Omit date to delete all skipped ClaimLogs globally.
 */
import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";
import { utcClaimedDateKey } from "@/lib/claimDate";

function parseDayArg(raw: string): Date {
  const trimmed = raw.trim();
  const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (ddMmYyyy) {
    const [, dd, mm, yyyy] = ddMmYyyy;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`Invalid date: ${JSON.stringify(trimmed)}`);
    }
    return new Date(Date.UTC(year, month - 1, day));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }
  throw new Error(
    `Date must be DD-MM-YYYY (e.g. 24-08-2026) or YYYY-MM-DD (UTC), got: ${JSON.stringify(trimmed)}`
  );
}

function parseOptionalClaimedDate(): Date | undefined {
  const fromArg = process.argv[2]?.trim();
  const fromEnv = process.env.CLAIMED_DATE?.trim();
  const raw = fromArg || fromEnv;
  if (!raw) return undefined;
  return parseDayArg(raw);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (or export it) and retry."
    );
  }

  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const claimedDate = parseOptionalClaimedDate();
  const dayKey = claimedDate ? utcClaimedDateKey(claimedDate) : null;

  const skipped = await prisma.claimLog.findMany({
    where: {
      status: "skipped",
      ...(claimedDate ? { claimedDate } : {}),
    },
    select: {
      id: true,
      userId: true,
      claimedDate: true,
      errorMsg: true,
    },
    orderBy: { claimedAt: "asc" },
  });

  const scope = dayKey ? `claimedDate=${dayKey} (UTC)` : "all dates";
  console.log(`Found ${skipped.length} skipped ClaimLog row(s) for ${scope}.`);

  const byError = new Map<string, number>();
  for (const row of skipped) {
    const key = row.errorMsg ?? "(no errorMsg)";
    byError.set(key, (byError.get(key) ?? 0) + 1);
  }
  for (const [msg, count] of [...byError.entries()].sort()) {
    console.log(`  error=${msg}: ${count}`);
  }

  const sample = skipped.slice(0, 10);
  for (const row of sample) {
    const msg = row.errorMsg ?? "(no errorMsg)";
    console.log(
      `  id=${row.id} userId=${row.userId} claimedDate=${row.claimedDate.toISOString().slice(0, 10)} error=${msg}`
    );
  }
  if (skipped.length > sample.length) {
    console.log(`  …and ${skipped.length - sample.length} more`);
  }

  if (skipped.length === 0) {
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log(`Dry run — would delete ${skipped.length} skipped ClaimLog(s).`);
    await prisma.$disconnect();
    return;
  }

  const ids = skipped.map((r) => r.id);
  await prisma.$transaction(async (tx) => {
    await tx.goClaimTokenTransferredLog.deleteMany({
      where: { claimLogId: { in: ids } },
    });
    await tx.goClaimUbiClaimedLog.deleteMany({
      where: { claimLogId: { in: ids } },
    });
    await tx.transferLog.deleteMany({
      where: { claimLogId: { in: ids } },
    });
    await tx.claimLog.deleteMany({
      where: { id: { in: ids } },
    });
  });

  console.log(`Deleted ${skipped.length} skipped ClaimLog(s).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
