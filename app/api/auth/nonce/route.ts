import { NextRequest, NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { isAddress } from "viem";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const nonce = generateSiweNonce();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.nonce.create({
    data: {
      address: address.toLowerCase(),
      nonce,
      expiresAt,
    },
  });

  return NextResponse.json({ nonce });
}
