import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { sessionCookieOptions, signJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireWhitelistedRoot } from "@/lib/requireWhitelistedRoot";
import { publicClient } from "@/lib/onchain/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body as {
      message?: string;
      signature?: `0x${string}`;
    };

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const domain = new URL(appUrl).host;

    const valid = await verifySiweMessage(publicClient, {
      message,
      signature,
      domain,
    });

    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed = parseSiweMessage(message);
    const address = parsed.address;
    const nonce = parsed.nonce;

    if (!address || !nonce) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    const stored = await prisma.nonce.findFirst({
      where: {
        address: address.toLowerCase(),
        nonce,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (!stored) {
      return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
    }

    await prisma.nonce.deleteMany({
      where: { address: address.toLowerCase() },
    });

    await requireWhitelistedRoot(address);

    const user = await prisma.user.upsert({
      where: { rootAddress: address.toLowerCase() },
      create: { rootAddress: address.toLowerCase() },
      update: {},
    });

    const token = await signJwt({
      sub: address.toLowerCase(),
      userId: user.id,
    });

    cookies().set(sessionCookieOptions(token));

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
