import { NextRequest, NextResponse } from "next/server";
import { type Address, type Hash, isHash } from "viem";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveGoClaimAccount } from "@/lib/onchain/resolveGoClaimAccount";
import { verifyConnectAccountTx } from "@/lib/onchain/verifyConnectAccountTx";
import { ensureGoClaimAccountConnectedLog } from "@/lib/onchain/goClaim/persistEventLog";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { txHash?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const txHash = body.txHash;
  if (!txHash || !isHash(txHash)) {
    return NextResponse.json({ error: "Valid txHash required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { goClaimWallet: true, connectAccountLog: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.goClaimWallet) {
    return NextResponse.json({ error: "GoClaim account not found" }, { status: 404 });
  }

  const resolved = await resolveGoClaimAccount(session.userId);
  if (!resolved) {
    return NextResponse.json({ error: "GoClaim account not found" }, { status: 404 });
  }

  if (!user.connectAccountLog) {
    try {
      await verifyConnectAccountTx({
        txHash: txHash as Hash,
        rootAddress: user.rootAddress as Address,
        goClaimAccountAddress: resolved.goClaimAccountAddress,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid connectAccount transaction";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await prisma.connectAccountLog.create({
      data: {
        userId: user.id,
        goClaimAccountAddress: resolved.goClaimAccountAddress,
        rootAddress: user.rootAddress,
        txHash,
      },
    });
  }

  const connectLog =
    user.connectAccountLog ??
    (await prisma.connectAccountLog.findUnique({
      where: { userId: user.id },
    }));

  if (!connectLog) {
    return NextResponse.json({ error: "Connect log not found" }, { status: 500 });
  }

  let goClaimAccountConnectedLog: { txHash: string; userOpHash: string } | null =
    null;
  try {
    const logRef = await ensureGoClaimAccountConnectedLog(
      session.userId,
      user.rootAddress as Address
    );
    if (logRef) {
      goClaimAccountConnectedLog = {
        txHash: logRef.txHash,
        userOpHash: logRef.userOpHash,
      };
    }
  } catch (error) {
    console.error("GoClaim ensureGoClaimAccountConnectedLog failed:", error);
  }

  return NextResponse.json(
    {
      id: connectLog.id,
      txHash: connectLog.txHash,
      connectedAt: connectLog.connectedAt.toISOString(),
      ...(goClaimAccountConnectedLog ? { goClaimAccountConnectedLog } : {}),
    },
    { status: user.connectAccountLog ? 200 : 201 }
  );
}
