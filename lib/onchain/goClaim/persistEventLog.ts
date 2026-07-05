import { type Address, type Hash } from "viem";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { goClaimAbi } from "../abis/goClaim";
import { GOCLAIM_PROXY_ADDRESS } from "../constants";
import { publicClient } from "../config";
import { getGoClaimWalletPrivateKey } from "../goClaimWallet";
import { resolveGoClaimAccount } from "../resolveGoClaimAccount";
import {
  isGoClaimSigningConfigured,
  submitLogAccountConnected,
  submitLogAccountCreated,
} from "./submitLog";

export type GoClaimEventLogRef = {
  txHash: Hash;
  userOpHash: Hash;
};

export function requireGoClaimSigningInProduction(): void {
  if (process.env.NODE_ENV === "production" && !isGoClaimSigningConfigured()) {
    throw new Error("APP_PRIVATE_KEY is required for GoClaim event logging");
  }
}

export async function readGoClaimOnChainFlags(goClaimAccountAddress: Address) {
  const [isAccountCreated, isAccountConnected] = await publicClient.multicall({
    contracts: [
      {
        address: GOCLAIM_PROXY_ADDRESS,
        abi: goClaimAbi,
        functionName: "isAccountCreated",
        args: [goClaimAccountAddress],
      },
      {
        address: GOCLAIM_PROXY_ADDRESS,
        abi: goClaimAbi,
        functionName: "isAccountConnected",
        args: [goClaimAccountAddress],
      },
    ],
  });

  if (isAccountCreated.status !== "success" || isAccountConnected.status !== "success") {
    throw new Error("Failed to read GoClaim on-chain flags");
  }

  return {
    isAccountCreated: isAccountCreated.result,
    isAccountConnected: isAccountConnected.result,
  };
}

export async function ensureGoClaimAccountCreatedLog(
  userId: string
): Promise<GoClaimEventLogRef | null> {
  const existing = await prisma.goClaimAccountCreatedLog.findUnique({
    where: { userId },
  });
  if (existing) {
    return {
      txHash: existing.txHash as Hash,
      userOpHash: existing.userOpHash as Hash,
    };
  }

  const resolved = await resolveGoClaimAccount(userId);
  if (!resolved) return null;

  const flags = await readGoClaimOnChainFlags(resolved.goClaimAccountAddress);
  if (flags.isAccountCreated) {
    return null;
  }

  requireGoClaimSigningInProduction();
  if (!isGoClaimSigningConfigured()) {
    return null;
  }

  const privateKeyHex = await getGoClaimWalletPrivateKey(userId);
  if (!privateKeyHex) return null;

  const logResult = await submitLogAccountCreated(
    privateKeyHex,
    resolved.goClaimAccountAddress
  );
  if (!logResult) return null;

  const row = await prisma.goClaimAccountCreatedLog.create({
    data: {
      userId,
      goClaimAccountAddress: resolved.goClaimAccountAddress,
      txHash: logResult.transactionHash,
      userOpHash: logResult.userOpHash,
    },
  });

  return {
    txHash: row.txHash as Hash,
    userOpHash: row.userOpHash as Hash,
  };
}

export async function ensureGoClaimAccountConnectedLog(
  userId: string,
  rootAddress: Address
): Promise<GoClaimEventLogRef | null> {
  const existing = await prisma.goClaimAccountConnectedLog.findUnique({
    where: { userId },
  });
  if (existing) {
    return {
      txHash: existing.txHash as Hash,
      userOpHash: existing.userOpHash as Hash,
    };
  }

  const resolved = await resolveGoClaimAccount(userId);
  if (!resolved) return null;

  const flags = await readGoClaimOnChainFlags(resolved.goClaimAccountAddress);
  if (flags.isAccountConnected) {
    return null;
  }

  requireGoClaimSigningInProduction();
  if (!isGoClaimSigningConfigured()) {
    return null;
  }

  const privateKeyHex = await getGoClaimWalletPrivateKey(userId);
  if (!privateKeyHex) return null;

  const logResult = await submitLogAccountConnected(
    privateKeyHex,
    resolved.goClaimAccountAddress,
    rootAddress
  );
  if (!logResult) return null;

  const row = await prisma.goClaimAccountConnectedLog.create({
    data: {
      userId,
      goClaimAccountAddress: resolved.goClaimAccountAddress,
      rootAddress: rootAddress.toLowerCase(),
      txHash: logResult.transactionHash,
      userOpHash: logResult.userOpHash,
    },
  });

  return {
    txHash: row.txHash as Hash,
    userOpHash: row.userOpHash as Hash,
  };
}

export type ClaimGoClaimEventLogsInput = {
  userId: string;
  claimLogId: string;
  goClaimAccountAddress: Address;
  rootAddress: Address;
  tokenAddress: Address;
  amountWei: string;
  txHash: Hash;
  userOpHash: Hash;
};

export async function createClaimGoClaimEventLogs(
  tx: Prisma.TransactionClient,
  input: ClaimGoClaimEventLogsInput
): Promise<void> {
  await tx.goClaimUbiClaimedLog.create({
    data: {
      userId: input.userId,
      claimLogId: input.claimLogId,
      goClaimAccountAddress: input.goClaimAccountAddress,
      rootAddress: input.rootAddress.toLowerCase(),
      tokenAddress: input.tokenAddress.toLowerCase(),
      amountWei: input.amountWei,
      txHash: input.txHash,
      userOpHash: input.userOpHash,
    },
  });

  await tx.goClaimTokenTransferredLog.create({
    data: {
      userId: input.userId,
      claimLogId: input.claimLogId,
      goClaimAccountAddress: input.goClaimAccountAddress,
      recipientAddress: input.rootAddress.toLowerCase(),
      tokenAddress: input.tokenAddress.toLowerCase(),
      amountWei: input.amountWei,
      txHash: input.txHash,
      userOpHash: input.userOpHash,
    },
  });
}
