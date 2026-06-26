import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueClaimWaves } from "@/lib/queue";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agents = await prisma.agentWallet.findMany({
    where: { isActive: true },
    select: { userId: true },
  });

  const userIds = agents.map((a) => a.userId);

  if (userIds.length === 0) {
    return NextResponse.json({ enqueued: 0, waves: 0 });
  }

  const result = await enqueueClaimWaves(userIds);
  return NextResponse.json(result);
}
