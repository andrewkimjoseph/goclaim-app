import { type Hex } from "viem";
import { generatePrivateKey } from "viem/accounts";
import { encryptPrivateKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { deriveGoClaimAccount } from "./deriveGoClaimAccount";

export async function createGoClaimWallet(userId: string) {
  const existing = await prisma.goClaimWallet.findUnique({ where: { userId } });
  if (existing) {
    const privateKey = (await import("@/lib/crypto")).decryptPrivateKey(
      existing.encryptedPrivateKey,
      existing.iv
    ) as Hex;
    const privateKeyHex = (
      privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
    ) as Hex;
    const derived = await deriveGoClaimAccount(privateKeyHex);
    return {
      goClaimAccountAddress: derived.goClaimAccountAddress,
      linkStatus: "pending" as const,
      isNew: false as const,
    };
  }

  const privateKey = generatePrivateKey();
  const { goClaimAccountAddress, eoaAddress } =
    await deriveGoClaimAccount(privateKey);

  if (goClaimAccountAddress.toLowerCase() === eoaAddress.toLowerCase()) {
    throw new Error("Invalid GoClaim account: address matches signer EOA");
  }

  const { encrypted, iv } = encryptPrivateKey(privateKey);

  await prisma.goClaimWallet.create({
    data: {
      userId,
      goClaimAccountAddress,
      eoaAddress,
      encryptedPrivateKey: encrypted,
      iv,
    },
  });

  return {
    goClaimAccountAddress,
    linkStatus: "pending" as const,
    isNew: true as const,
    privateKeyHex: privateKey,
  };
}

export async function getGoClaimWalletPrivateKey(
  userId: string
): Promise<Hex | null> {
  const { decryptPrivateKey } = await import("@/lib/crypto");
  const wallet = await prisma.goClaimWallet.findUnique({ where: { userId } });
  if (!wallet) return null;
  const key = decryptPrivateKey(wallet.encryptedPrivateKey, wallet.iv);
  return (key.startsWith("0x") ? key : `0x${key}`) as Hex;
}
