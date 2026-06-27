import { type Prisma } from "@prisma/client";
import { type Address, type Hex } from "viem";
import { decryptPrivateKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { claimUbi } from "@/lib/onchain/claimUbi";
import { checkUbiClaimEligibility } from "@/lib/onchain/eligibility";
import type { ClaimJobData } from "@/lib/queue";

const CLAIM_TIMEOUT_MS = 45_000;

export async function processClaim(data: ClaimJobData): Promise<void> {
  const { userId, waveIndex } = data;

  const agent = await prisma.agentWallet.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!agent || !agent.isActive) {
    await prisma.claimLog.create({
      data: {
        userId,
        status: "skipped",
        errorMsg: "No active agent wallet",
        waveIndex,
      },
    });
    return;
  }

  const privateKey = decryptPrivateKey(
    agent.encryptedPrivateKey,
    agent.iv
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
      agent.user.rootAddress as Address
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
          txHash: result.transactionHash,
          waveIndex,
        },
      });

      await tx.transferLog.create({
        data: {
          userId,
          claimLogId: claimLog.id,
          recipientAddress: agent.user.rootAddress.toLowerCase(),
          amountWei: result.entitlement,
          txHash: result.transactionHash,
          userOpHash: result.userOpHash,
        },
      });

      await tx.agentWallet.update({
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
