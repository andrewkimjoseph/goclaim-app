/**
 * Backfill GoClaimAccountCreated / GoClaimAccountConnected Postgres logs
 * for existing users (submits on-chain UserOps when not yet logged).
 *
 * Usage: npm run backfill:goclaim-logs
 */
import { type Address } from "viem";
import { prisma } from "@/lib/prisma";
import {
  ensureGoClaimAccountConnectedLog,
  ensureGoClaimAccountCreatedLog,
} from "@/lib/onchain/goClaim/persistEventLog";

const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const wallets = await prisma.goClaimWallet.findMany({
    include: {
      user: {
        include: { connectAccountLog: true },
      },
    },
  });

  console.log(`Backfilling GoClaim event logs for ${wallets.length} wallet(s)...`);

  let created = 0;
  let connected = 0;
  let errors = 0;

  for (const wallet of wallets) {
    const label = `${wallet.userId} (${wallet.goClaimAccountAddress})`;

    try {
      const createdLog = await ensureGoClaimAccountCreatedLog(wallet.userId);
      if (createdLog) {
        created += 1;
        console.log(`[created] ${label} tx=${createdLog.txHash}`);
      }
    } catch (error) {
      errors += 1;
      console.error(`[created] ${label} failed:`, error);
    }

    await sleep(DELAY_MS);

    if (wallet.user.connectAccountLog) {
      try {
        const connectedLog = await ensureGoClaimAccountConnectedLog(
          wallet.userId,
          wallet.user.rootAddress as Address
        );
        if (connectedLog) {
          connected += 1;
          console.log(`[connected] ${label} tx=${connectedLog.txHash}`);
        }
      } catch (error) {
        errors += 1;
        console.error(`[connected] ${label} failed:`, error);
      }

      await sleep(DELAY_MS);
    }
  }

  console.log(
    `Done. created=${created} connected=${connected} errors=${errors} (skipped rows already in DB or on-chain)`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
