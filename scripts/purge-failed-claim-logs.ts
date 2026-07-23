/**
 * Delete all ClaimLog rows with status "failed" (and child transfer/event logs).
 * Needed after a failed daily claim so the unique (userId, claimedDate) slot
 * can be reused by a successful cron run.
 *
 * Usage:
 *   npm run purge:failed-claim-logs
 *   DRY_RUN=1 npm run purge:failed-claim-logs
 */
import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (or export it) and retry."
    );
  }

  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  const failed = await prisma.claimLog.findMany({
    where: { status: "failed" },
    select: {
      id: true,
      userId: true,
      claimedDate: true,
      errorMsg: true,
    },
    orderBy: { claimedAt: "asc" },
  });

  console.log(`Found ${failed.length} failed ClaimLog row(s).`);

  const sample = failed.slice(0, 10);
  for (const row of sample) {
    const msg = row.errorMsg
      ? row.errorMsg.length > 80
        ? `${row.errorMsg.slice(0, 80)}…`
        : row.errorMsg
      : "(no errorMsg)";
    console.log(
      `  id=${row.id} userId=${row.userId} claimedDate=${row.claimedDate.toISOString().slice(0, 10)} error=${msg}`
    );
  }
  if (failed.length > sample.length) {
    console.log(`  …and ${failed.length - sample.length} more`);
  }

  if (failed.length === 0) {
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log(`Dry run — would delete ${failed.length} ClaimLog(s).`);
    await prisma.$disconnect();
    return;
  }

  const ids = failed.map((r) => r.id);
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

  console.log(`Deleted ${failed.length} failed ClaimLog(s).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
