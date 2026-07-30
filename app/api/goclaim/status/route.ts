import { NextRequest, NextResponse } from "next/server";
import { type Address } from "viem";
import { isAccountCreationEnabled } from "@/lib/accountCreation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLinkStatus } from "@/lib/onchain/eligibility";
import { resolveGoClaimAccount } from "@/lib/onchain/resolveGoClaimAccount";
import { publicClient } from "@/lib/onchain/config";
import { formatEntitlementGd, formatGdAmountWhole } from "@/lib/onchain/claimUbi";
import { formatUsdmDisplay } from "@/lib/onchain/formatUsdm";
import { getRootGdBalance, type RootGdBalance } from "@/lib/onchain/getRootGdBalance";
import { quoteGdWeiToUsdm } from "@/lib/onchain/quoteGdToUsdm";
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

async function quoteStatusAmounts(params: {
  rootBalance: RootGdBalance | null;
  totalWei: bigint;
  claimLogs: ClaimLogRow[];
}) {
  const balanceWei = params.rootBalance?.wei ?? "0";
  const claimWeis = params.claimLogs.map((log) => log.transfer?.amountWei ?? "0");
  const amountsWei = [balanceWei, params.totalWei.toString(), ...claimWeis];

  try {
    const quotes = await quoteGdWeiToUsdm(amountsWei);
    return {
      rootGdBalanceUsdm: formatUsdmDisplay(quotes[0]),
      lifetimeGdClaimedUsdm: formatUsdmDisplay(quotes[1]),
      claimAmountUsdm: quotes.slice(2).map((quote) => formatUsdmDisplay(quote)),
    };
  } catch (error) {
    console.error("Failed to quote G$→USDm for GoClaim status", error);
    return {
      rootGdBalanceUsdm: null,
      lifetimeGdClaimedUsdm: null,
      claimAmountUsdm: params.claimLogs.map(() => null),
    };
  }
}

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
    let rootGdBalanceUsdm: string | null = null;
    try {
      const balance = await getRootGdBalance(user.rootAddress as Address);
      rootGdBalance = balance.formatted;
      const [quote] = await quoteGdWeiToUsdm([balance.wei]);
      rootGdBalanceUsdm = formatUsdmDisplay(quote);
    } catch {
      rootGdBalance = null;
      rootGdBalanceUsdm = null;
    }
    return NextResponse.json({
      hasGoClaimAccount: false,
      accountCreationEnabled: isAccountCreationEnabled(),
      rootAddress: user.rootAddress,
      rootGdBalance,
      rootGdBalanceUsdm,
    });
  }

  const [rootBalanceResult, resolved, successfulClaims, transfers] = await Promise.all([
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
    timeZone,
  );

  const totalWei = transfers.reduce(
    (sum, transfer) => sum + BigInt(transfer.amountWei),
    BigInt(0),
  );

  const claimLogRows = user.claimLogs as ClaimLogRow[];
  const { rootGdBalanceUsdm, lifetimeGdClaimedUsdm, claimAmountUsdm } =
    await quoteStatusAmounts({
      rootBalance: rootBalanceResult,
      totalWei,
      claimLogs: claimLogRows,
    });

  return NextResponse.json({
    hasGoClaimAccount: true,
    accountCreationEnabled: isAccountCreationEnabled(),
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
    lifetimeGdClaimedUsdm,
    claimStreak,
    rootGdBalance: rootBalanceResult?.formatted ?? null,
    rootGdBalanceUsdm,
    goClaimEventLogs: {
      accountCreated: Boolean(user.goClaimAccountCreatedLog),
      accountConnected: Boolean(user.goClaimAccountConnectedLog),
    },
    claimLogs: claimLogRows.map((log, index) => ({
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
            amountUsdm: claimAmountUsdm[index] ?? null,
            txHash: log.transfer.txHash,
            userOpHash: log.transfer.userOpHash,
            transferredAt: log.transfer.transferredAt.toISOString(),
          }
        : null,
    })),
  });
}
