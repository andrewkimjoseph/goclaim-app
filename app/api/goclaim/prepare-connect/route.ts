import { NextRequest, NextResponse } from "next/server";
import { type Address } from "viem";
import { getSession } from "@/lib/auth";
import { celina } from "@/lib/celina";
import { identityAbi } from "@/lib/onchain/abis/identity";
import { IDENTITY_PROXY_ADDRESS } from "@/lib/onchain/constants";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rootAddress?: string; goClaimAccountAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rootAddress, goClaimAccountAddress } = body;
  if (!rootAddress || !goClaimAccountAddress) {
    return NextResponse.json(
      { error: "rootAddress and goClaimAccountAddress are required" },
      { status: 400 },
    );
  }

  const prepared = await celina.contract.prepareFunction(
    rootAddress as Address,
    {
      contractAddress: IDENTITY_PROXY_ADDRESS,
      abi: identityAbi,
      functionName: "connectAccount",
      functionArgs: [goClaimAccountAddress as Address],
    },
  );

  const step = prepared.steps[0];
  if (!step?.to || !step.data) {
    return NextResponse.json(
      { error: "prepareFunction returned no valid step" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    to: step.to,
    data: step.data,
    value: step.value ?? "0",
  });
}