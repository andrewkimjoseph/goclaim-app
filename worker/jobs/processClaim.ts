import { type Prisma } from "@prisma/client";
import { type Address, type Hex } from "viem";
import { decryptPrivateKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { claimUbi } from "@/lib/onchain/claimUbi";
import { checkUbiClaimEligibility } from "@/lib/onchain/eligibility";
import { GOOD_DOLLAR_TOKEN_ADDRESS } from "@/lib/onchain/constants";
import { createClaimGoClaimEventLogs } from "@/lib/onchain/goClaim/persistEventLog";
import type { ClaimJobData } from "@/lib/queue";

const CLAIM_TIMEOUT_MS = 45_000;

export async function processClaim(data: ClaimJobData): Promise<void> {
  const { userId, waveIndex } = data;

  const goClaimWallet = await prisma.goClaimWallet.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!goClaimWallet || !goClaimWallet.isActive) {
    await prisma.claimLog.create({
      data: {
        userId,
        status: "skipped",
        errorMsg: "No active GoClaim account",
        waveIndex,
      },
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
      await prisma.claimLog.create({
        data: {
          userId,
          status: "skipped",
          errorMsg: "already_claimed",
          waveIndex,
        },
      });
      return;
    }

    if (eligibility.status === "not_whitelisted") {
      await prisma.claimLog.create({
        data: {
          userId,
          status: "skipped",
          errorMsg: "not_whitelisted",
          waveIndex,
        },
      });
      return;
    }

    if (eligibility.status === "no_entitlement") {
      await prisma.claimLog.create({
        data: {
          userId,
          status: "skipped",
          errorMsg: "no_entitlement",
          waveIndex,
        },
      });
      return;
    }

    const result = await claimUbi(
      privateKeyHex,
      goClaimWallet.user.rootAddress as Address
    );

    if (!result.claimed) {
      await prisma.claimLog.create({
        data: {
          userId,
          status: "skipped",
          errorMsg: result.reason,
          waveIndex,
        },
      });
      return;
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claimLog = await tx.claimLog.create({
        data: {
          userId,
          status: "success",
          txHash: result.userOpHash,
          waveIndex,
        },
      });

      await tx.transferLog.create({
        data: {
          userId,
          claimLogId: claimLog.id,
          recipientAddress: goClaimWallet.user.rootAddress.toLowerCase(),
          amountWei: result.entitlement,
          txHash: result.transactionHash,
          userOpHash: result.userOpHash,
        },
      });

      if (result.goClaimEventsLogged) {
        await createClaimGoClaimEventLogs(tx, {
          userId,
          claimLogId: claimLog.id,
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
    const errorMsg =
      error instanceof Error ? error.message : "Unknown claim error";
    await prisma.claimLog.create({
      data: {
        userId,
        status: "failed",
        errorMsg,
        waveIndex,
      },
    });
    throw error;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
