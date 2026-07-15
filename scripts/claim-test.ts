/**
 * Manual end-to-end claim test for a single userId.
 * Usage: USER_ID=... npm run claim-test
 */
import "@/lib/loadEnv";
import { prisma } from "@/lib/prisma";
import { processClaim } from "@/worker/jobs/processClaim";

async function main() {
  const userId = process.env.USER_ID;
  if (!userId) {
    throw new Error("Set USER_ID env var");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  console.log(`Running claim test for ${user.rootAddress}...`);
  await processClaim({ userId, waveIndex: 0 });
  console.log("Done — check ClaimLog, TransferLog, and GoClaim event log tables");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
