/**
 * Delete ClaimLog rows for a UTC claimedDate (and child transfer/event logs)
 * so the unique (userId, claimedDate) slot can be reused by another cron.
 *
 * Also clears GoClaimWallet.lastClaimedAt when it falls on that same UTC day.
 *
 * Usage:
 *   npm run purge:claim-logs
 *   DRY_RUN=1 npm run purge:claim-logs
 *   npm run purge:claim-logs -- 23-08-2026
 *   CLAIMED_DATE=23-08-2026 npm run purge:claim-logs
 *   CLAIMED_DATE=2026-08-23 npm run purge:claim-logs   # ISO also accepted
 */
import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";
import { utcClaimedDate, utcClaimedDateKey } from "@/lib/claimDate";

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
    `Date must be DD-MM-YYYY (e.g. 23-08-2026) or YYYY-MM-DD (UTC), got: ${JSON.stringify(trimmed)}`
  );
}

function parseClaimedDate(): Date {
  const fromArg = process.argv[2]?.trim();
  const fromEnv = process.env.CLAIMED_DATE?.trim();
  const raw = fromArg || fromEnv;
  if (!raw) return utcClaimedDate();
  return parseDayArg(raw);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (or export it) and retry."
    );
  }

  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const claimedDate = parseClaimedDate();
  const dayKey = utcClaimedDateKey(claimedDate);
  const nextDay = new Date(claimedDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const rows = await prisma.claimLog.findMany({
    where: { claimedDate },
    select: {
      id: true,
      userId: true,
      status: true,
      claimedDate: true,
    },
    orderBy: { claimedAt: "asc" },
  });

  console.log(
    `Found ${rows.length} ClaimLog row(s) for claimedDate=${dayKey} (UTC).`
  );

  const byStatus = new Map<string, number>();
  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }
  for (const [status, count] of [...byStatus.entries()].sort()) {
    console.log(`  status=${status}: ${count}`);
  }

  const sample = rows.slice(0, 10);
  for (const row of sample) {
    console.log(
      `  id=${row.id} userId=${row.userId} status=${row.status}`
    );
  }
  if (rows.length > sample.length) {
    console.log(`  …and ${rows.length - sample.length} more`);
  }

  const walletsToClear = await prisma.goClaimWallet.count({
    where: {
      lastClaimedAt: {
        gte: claimedDate,
        lt: nextDay,
      },
    },
  });
  console.log(
    `GoClaimWallet.lastClaimedAt on ${dayKey}: ${walletsToClear} wallet(s) to clear.`
  );

  if (rows.length === 0 && walletsToClear === 0) {
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log(
      `Dry run — would delete ${rows.length} ClaimLog(s) and clear ${walletsToClear} lastClaimedAt.`
    );
    await prisma.$disconnect();
    return;
  }

  const ids = rows.map((r) => r.id);
  await prisma.$transaction(async (tx) => {
    if (ids.length > 0) {
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
    }
    await tx.goClaimWallet.updateMany({
      where: {
        lastClaimedAt: {
          gte: claimedDate,
          lt: nextDay,
        },
      },
      data: { lastClaimedAt: null },
    });
  });

  console.log(
    `Deleted ${rows.length} ClaimLog(s) for ${dayKey}; cleared ${walletsToClear} lastClaimedAt.`
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
