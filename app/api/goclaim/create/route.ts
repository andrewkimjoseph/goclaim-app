import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createGoClaimWallet } from "@/lib/onchain/goClaimWallet";
import { ensureGoClaimAccountCreatedLog } from "@/lib/onchain/goClaim/persistEventLog";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wallet = await createGoClaimWallet(session.userId);

    let goClaimAccountCreatedLog: { txHash: string; userOpHash: string } | null =
      null;
    try {
      const logRef = await ensureGoClaimAccountCreatedLog(session.userId);
      if (logRef) {
        goClaimAccountCreatedLog = {
          txHash: logRef.txHash,
          userOpHash: logRef.userOpHash,
        };
      }
    } catch (error) {
      console.error("GoClaim ensureGoClaimAccountCreatedLog failed:", error);
    }

    return NextResponse.json({
      goClaimAccountAddress: wallet.goClaimAccountAddress,
      linkStatus: wallet.linkStatus,
      ...(goClaimAccountCreatedLog ? { goClaimAccountCreatedLog } : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create GoClaim wallet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
