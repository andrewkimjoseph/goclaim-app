/**
 * Remove duplicate ClaimLog rows so each user has at most one log per UTC day.
 * Keeps the best row (success with children preferred). Deletes losers and their
 * TransferLog / GoClaimUbiClaimedLog / GoClaimTokenTransferredLog children first.
 *
 * Run BEFORE `prisma migrate deploy` for claimedDate if duplicates exist.
 *
 * Usage:
 *   npm run dedupe:daily-claim-logs
 *   DRY_RUN=1 npm run dedupe:daily-claim-logs
 */
import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";
import { utcClaimedDateKey } from "@/lib/claimDate";

type ClaimRow = {
  id: string;
  userId: string;
  status: string;
  claimedAt: Date;
  transfer: { id: string } | null;
  goClaimUbiClaimedLog: { id: string } | null;
  goClaimTokenTransferredLog: { id: string } | null;
};

function score(row: ClaimRow): number {
  const isSuccess = row.status === "success" ? 1000 : 0;
  const hasTransfer = row.transfer ? 100 : 0;
  const hasUbi = row.goClaimUbiClaimedLog ? 10 : 0;
  const hasToken = row.goClaimTokenTransferredLog ? 1 : 0;
  const timeBias =
    row.status === "success"
      ? -row.claimedAt.getTime() / 1e13
      : row.claimedAt.getTime() / 1e13;
  return isSuccess + hasTransfer + hasUbi + hasToken + timeBias;
}

function pickKeep(rows: ClaimRow[]): ClaimRow {
  return [...rows].sort((a, b) => score(b) - score(a))[0]!;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (or export it) and retry."
    );
  }

  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

  // Explicit select omits claimedDate so this works before the unique-daily migration.
  const logs = (await prisma.claimLog.findMany({
    select: {
      id: true,
      userId: true,
      status: true,
      claimedAt: true,
      transfer: { select: { id: true } },
      goClaimUbiClaimedLog: { select: { id: true } },
      goClaimTokenTransferredLog: { select: { id: true } },
    },
    orderBy: { claimedAt: "asc" },
  })) as ClaimRow[];

  const groups = new Map<string, ClaimRow[]>();
  for (const log of logs) {
    const key = `${log.userId}|${utcClaimedDateKey(log.claimedAt)}`;
    const list = groups.get(key) ?? [];
    list.push(log);
    groups.set(key, list);
  }

  let groupsWithDupes = 0;
  let deleted = 0;

  for (const [key, rows] of groups) {
    if (rows.length < 2) continue;
    groupsWithDupes += 1;
    const keep = pickKeep(rows);
    const losers = rows.filter((r) => r.id !== keep.id);
    console.log(
      `[${key}] keep=${keep.id} status=${keep.status} delete=${losers.length} (${losers.map((l) => `${l.id}:${l.status}`).join(", ")})`
    );

    if (dryRun) {
      deleted += losers.length;
      continue;
    }

    const loserIds = losers.map((l) => l.id);
    await prisma.$transaction(async (tx) => {
      await tx.goClaimTokenTransferredLog.deleteMany({
        where: { claimLogId: { in: loserIds } },
      });
      await tx.goClaimUbiClaimedLog.deleteMany({
        where: { claimLogId: { in: loserIds } },
      });
      await tx.transferLog.deleteMany({
        where: { claimLogId: { in: loserIds } },
      });
      await tx.claimLog.deleteMany({
        where: { id: { in: loserIds } },
      });
    });
    deleted += losers.length;
  }

  console.log(
    `Done. duplicateGroups=${groupsWithDupes} deleted=${deleted}${dryRun ? " (dry run)" : ""}`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
