/**
 * Delete all ClaimLog rows for today's UTC claimedDate (and child transfer/event
 * logs) so the unique (userId, claimedDate) slot can be reused by another cron.
 *
 * Also clears GoClaimWallet.lastClaimedAt when it falls on that same UTC day.
 *
 * Usage:
 *   npm run purge:todays-claim-logs
 *   DRY_RUN=1 npm run purge:todays-claim-logs
 *   CLAIMED_DATE=2026-08-21 npm run purge:todays-claim-logs   # optional override (UTC YYYY-MM-DD)
 */
import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";
import { utcClaimedDate, utcClaimedDateKey } from "@/lib/claimDate";

function parseClaimedDate(): Date {
  const raw = process.env.CLAIMED_DATE?.trim();
  if (!raw) return utcClaimedDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(
      `CLAIMED_DATE must be YYYY-MM-DD (UTC), got: ${JSON.stringify(raw)}`
    );
  }
  const [y, m, d] = raw.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
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
