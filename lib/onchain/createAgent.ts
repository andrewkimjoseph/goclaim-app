import { type Hex } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { encryptPrivateKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { createSmartAccount } from "./createSmartAccount";

export async function createAgentWallet(userId: string) {
  const existing = await prisma.agentWallet.findUnique({ where: { userId } });
  if (existing) {
    const privateKey = (await import("@/lib/crypto")).decryptPrivateKey(
      existing.encryptedPrivateKey,
      existing.iv
    ) as Hex;
    const privateKeyHex = (
      privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
    ) as Hex;
    const derived = await createSmartAccount(privateKeyHex);
    return {
      simpleSmartAccountAddress: derived.smartAccountAddress,
      smartAccountAddress: derived.smartAccountAddress,
      linkStatus: "pending" as const,
    };
  }

  const privateKey = generatePrivateKey();
  const { smartAccountAddress, eoaAddress } = await createSmartAccount(privateKey);

  if (smartAccountAddress.toLowerCase() === eoaAddress.toLowerCase()) {
    throw new Error("Invalid agent: smart account address matches signer EOA");
  }

  const { encrypted, iv } = encryptPrivateKey(privateKey);

  await prisma.agentWallet.create({
    data: {
      userId,
      smartAccountAddress,
      eoaAddress,
      encryptedPrivateKey: encrypted,
      iv,
    },
  });

  return {
    simpleSmartAccountAddress: smartAccountAddress,
    smartAccountAddress,
    linkStatus: "pending" as const,
  };
}

export async function getAgentPrivateKey(userId: string): Promise<Hex | null> {
  const { decryptPrivateKey } = await import("@/lib/crypto");
  const agent = await prisma.agentWallet.findUnique({ where: { userId } });
  if (!agent) return null;
  const key = decryptPrivateKey(agent.encryptedPrivateKey, agent.iv);
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}
