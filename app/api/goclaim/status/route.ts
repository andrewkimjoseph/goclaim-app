import { NextRequest, NextResponse } from "next/server";
import { type Address } from "viem";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLinkStatus } from "@/lib/onchain/eligibility";
import { resolveGoClaimAccount } from "@/lib/onchain/resolveGoClaimAccount";
import { publicClient } from "@/lib/onchain/config";
import { formatEntitlementGd, formatGdAmountWhole } from "@/lib/onchain/claimUbi";
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
      goClaimWallet: true,
      goClaimAccountCreatedLog: true,
      goClaimAccountConnectedLog: true,
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

  if (!user.goClaimWallet) {
    let rootGdBalance: string | null = null;
    try {
      rootGdBalance = await getRootGdBalance(user.rootAddress as Address);
    } catch {
      rootGdBalance = null;
    }
    return NextResponse.json({
      hasGoClaimAccount: false,
      rootAddress: user.rootAddress,
      rootGdBalance,
    });
  }

  const [rootGdBalance, resolved, successfulClaims, transfers] =
    await Promise.all([
      getRootGdBalance(user.rootAddress as Address).catch(() => null),
      resolveGoClaimAccount(session.userId),
      prisma.claimLog.findMany({
        where: { userId: user.id, status: "success" },
        select: { claimedAt: true },
      }),
      prisma.transferLog.findMany({
        where: { userId: user.id },
        select: { amountWei: true },
      }),
    ]);

  if (!resolved) {
    return NextResponse.json({ error: "GoClaim account not found" }, { status: 404 });
  }

  const goClaimAccountAddress = resolved.goClaimAccountAddress;

  const [link, accountBytecode] = await Promise.all([
    getLinkStatus(goClaimAccountAddress, user.rootAddress as Address),
    publicClient.getCode({ address: goClaimAccountAddress }),
  ]);
  const isDeployed = Boolean(accountBytecode && accountBytecode !== "0x");

  const claimStreak = computeClaimStreak(
    successfulClaims.map((c) => c.claimedAt),
    timeZone
  );

  const totalWei = transfers.reduce(
    (sum, t) => sum + BigInt(t.amountWei),
    BigInt(0)
  );

  return NextResponse.json({
    hasGoClaimAccount: true,
    rootAddress: user.rootAddress,
    goClaimAccountAddress,
    isCounterfactual: !isDeployed,
    isActive: user.goClaimWallet.isActive,
    lastClaimedAt: user.goClaimWallet.lastClaimedAt,
    linkStatus: link.linkComplete
      ? "active"
      : link.isWhitelisted
        ? "linked_other"
        : "pending",
    linkComplete: link.linkComplete,
    whitelistedRoot: link.whitelistedRoot,
    lifetimeClaims: successfulClaims.length,
    lifetimeGdClaimed: formatGdAmountWhole(totalWei.toString()),
    claimStreak,
    rootGdBalance,
    goClaimEventLogs: {
      accountCreated: Boolean(user.goClaimAccountCreatedLog),
      accountConnected: Boolean(user.goClaimAccountConnectedLog),
    },
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
