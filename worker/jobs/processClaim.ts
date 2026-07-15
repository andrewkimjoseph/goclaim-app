import { Prisma } from "@prisma/client";
import { type Address, type Hex } from "viem";
import { decryptPrivateKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { utcClaimedDate } from "@/lib/claimDate";
import { claimUbi } from "@/lib/onchain/claimUbi";
import { checkUbiClaimEligibility } from "@/lib/onchain/eligibility";
import { GOOD_DOLLAR_TOKEN_ADDRESS } from "@/lib/onchain/constants";
import { createClaimGoClaimEventLogs } from "@/lib/onchain/goClaim/persistEventLog";
import type { ClaimJobData } from "@/lib/queue";

const CLAIM_TIMEOUT_MS = 45_000;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** Create at most one ClaimLog per user per UTC day; ignore unique races. */
async function createDailyClaimLog(
  client: Prisma.TransactionClient | typeof prisma,
  data: {
    userId: string;
    status: string;
    txHash?: string | null;
    errorMsg?: string | null;
    waveIndex?: number | null;
    claimedDate: Date;
  }
): Promise<string | null> {
  try {
    const row = await client.claimLog.create({
      data: {
        userId: data.userId,
        status: data.status,
        txHash: data.txHash ?? null,
        errorMsg: data.errorMsg ?? null,
        waveIndex: data.waveIndex ?? null,
        claimedDate: data.claimedDate,
      },
    });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function processClaim(data: ClaimJobData): Promise<void> {
  const { userId, waveIndex } = data;
  const claimedDate = utcClaimedDate();

  const existingToday = await prisma.claimLog.findUnique({
    where: {
      userId_claimedDate: { userId, claimedDate },
    },
    select: { id: true },
  });
  if (existingToday) {
    return;
  }

  const goClaimWallet = await prisma.goClaimWallet.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!goClaimWallet || !goClaimWallet.isActive) {
    await createDailyClaimLog(prisma, {
      userId,
      status: "skipped",
      errorMsg: "No active GoClaim account",
      waveIndex,
      claimedDate,
    });
    return;
  }

  const privateKey = decryptPrivateKey(
    goClaimWallet.encryptedPrivateKey,
    goClaimWallet.iv
  ) as Hex;
  const privateKeyHex = (
    privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  ) as Hex;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLAIM_TIMEOUT_MS);

  try {
    const eligibility = await checkUbiClaimEligibility(privateKeyHex);

    if (eligibility.status === "already_claimed") {
      await createDailyClaimLog(prisma, {
        userId,
        status: "skipped",
        errorMsg: "already_claimed",
        waveIndex,
        claimedDate,
      });
      return;
    }

    if (eligibility.status === "not_whitelisted") {
      await createDailyClaimLog(prisma, {
        userId,
        status: "skipped",
        errorMsg: "not_whitelisted",
        waveIndex,
        claimedDate,
      });
      return;
    }

    if (eligibility.status === "no_entitlement") {
      await createDailyClaimLog(prisma, {
        userId,
        status: "skipped",
        errorMsg: "no_entitlement",
        waveIndex,
        claimedDate,
      });
      return;
    }

    const result = await claimUbi(
      privateKeyHex,
      goClaimWallet.user.rootAddress as Address
    );

    if (!result.claimed) {
      await createDailyClaimLog(prisma, {
        userId,
        status: "skipped",
        errorMsg: result.reason,
        waveIndex,
        claimedDate,
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const claimLogId = await createDailyClaimLog(tx, {
        userId,
        status: "success",
        txHash: result.userOpHash,
        waveIndex,
        claimedDate,
      });
      if (!claimLogId) {
        return;
      }

      await tx.transferLog.create({
        data: {
          userId,
          claimLogId,
          recipientAddress: goClaimWallet.user.rootAddress.toLowerCase(),
          amountWei: result.entitlement,
          txHash: result.transactionHash,
          userOpHash: result.userOpHash,
        },
      });

      if (result.goClaimEventsLogged) {
        await createClaimGoClaimEventLogs(tx, {
          userId,
          claimLogId,
          goClaimAccountAddress: result.goClaimAccountAddress,
          rootAddress: goClaimWallet.user.rootAddress as Address,
          tokenAddress: GOOD_DOLLAR_TOKEN_ADDRESS,
          amountWei: result.entitlement,
          txHash: result.transactionHash,
          userOpHash: result.userOpHash,
        });
      }

      await tx.goClaimWallet.update({
        where: { userId },
        data: { lastClaimedAt: new Date() },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return;
    }
    const errorMsg =
      error instanceof Error ? error.message : "Unknown claim error";
    await createDailyClaimLog(prisma, {
      userId,
      status: "failed",
      errorMsg,
      waveIndex,
      claimedDate,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
