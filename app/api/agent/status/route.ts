import { NextRequest, NextResponse } from "next/server";
import { type Address } from "viem";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLinkStatus } from "@/lib/onchain/eligibility";
import { resolveAgentAddresses } from "@/lib/onchain/resolveAgentAddresses";
import { publicClient } from "@/lib/onchain/config";
import { formatEntitlementGd, formatGdAmount } from "@/lib/onchain/claimUbi";
import { getRootGdBalance } from "@/lib/onchain/getRootGdBalance";
import { computeClaimStreak, parseTimezoneParam } from "@/lib/computeClaimStreak";

type TransferLogRow = {
  recipientAddress: string;
  amountWei: string;
  txHash: string;
  userOpHash: string;
  transferredAt: Date;
};

type ClaimLogRow = {
  id: string;
  status: string;
  txHash: string | null;
  errorMsg: string | null;
  claimedAt: Date;
  waveIndex: number | null;
  transfer: TransferLogRow | null;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claimLogsLimitParam = request.nextUrl.searchParams.get("claimLogsLimit");
  const parsedLimit = claimLogsLimitParam
    ? Number.parseInt(claimLogsLimitParam, 10)
    : 20;
  const claimLogsLimit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 20;

  const timeZone = parseTimezoneParam(request.nextUrl.searchParams.get("timezone"));

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      agentWallet: true,
      claimLogs: {
        orderBy: { claimedAt: "desc" },
        take: claimLogsLimit,
        include: { transfer: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let rootGdBalance: string | null = null;
  try {
    rootGdBalance = await getRootGdBalance(user.rootAddress as Address);
  } catch {
    rootGdBalance = null;
  }

  if (!user.agentWallet) {
    return NextResponse.json({
      hasAgent: false,
      rootAddress: user.rootAddress,
      rootGdBalance,
    });
  }

  const resolved = await resolveAgentAddresses(session.userId);
  if (!resolved) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const simpleSmartAccountAddress = resolved.smartAccountAddress;

  const link = await getLinkStatus(
    simpleSmartAccountAddress,
    user.rootAddress as Address
  );

  const saBytecode = await publicClient.getBytecode({
    address: simpleSmartAccountAddress,
  });
  const isDeployed = Boolean(saBytecode && saBytecode !== "0x");

  const successfulClaims = await prisma.claimLog.findMany({
    where: { userId: user.id, status: "success" },
    select: { claimedAt: true },
  });

  const claimStreak = computeClaimStreak(
    successfulClaims.map((c) => c.claimedAt),
    timeZone
  );

  const transfers = await prisma.transferLog.findMany({
    where: { userId: user.id },
    select: { amountWei: true },
  });
  const totalWei = transfers.reduce(
    (sum, t) => sum + BigInt(t.amountWei),
    BigInt(0)
  );

  return NextResponse.json({
    hasAgent: true,
    rootAddress: user.rootAddress,
    /** ERC-4337 simple smart account — the connectAccount target and claim sender */
    simpleSmartAccountAddress,
    /** @deprecated use simpleSmartAccountAddress */
    smartAccountAddress: simpleSmartAccountAddress,
    isCounterfactual: !isDeployed,
    isActive: user.agentWallet.isActive,
    lastClaimedAt: user.agentWallet.lastClaimedAt,
    linkStatus: link.linkComplete
      ? "active"
      : link.isWhitelisted
        ? "linked_other"
        : "pending",
    linkComplete: link.linkComplete,
    whitelistedRoot: link.whitelistedRoot,
    lifetimeClaims: successfulClaims.length,
    lifetimeGdClaimed: formatGdAmount(totalWei.toString()),
    claimStreak,
    rootGdBalance,
    claimLogs: (user.claimLogs as ClaimLogRow[]).map((log) => ({
      id: log.id,
      status: log.status,
      txHash: log.txHash,
      errorMsg: log.errorMsg,
      claimedAt: log.claimedAt.toISOString(),
      waveIndex: log.waveIndex,
      transfer: log.transfer
        ? {
            recipientAddress: log.transfer.recipientAddress,
            amountWei: log.transfer.amountWei,
            amountGd: formatEntitlementGd(log.transfer.amountWei),
            txHash: log.transfer.txHash,
            userOpHash: log.transfer.userOpHash,
            transferredAt: log.transfer.transferredAt.toISOString(),
          }
        : null,
    })),
  });
}
