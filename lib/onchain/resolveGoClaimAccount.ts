import { type Hex } from "viem";
import { decryptPrivateKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { deriveGoClaimAccount } from "./deriveGoClaimAccount";

export type ResolvedGoClaimAccount = {
  goClaimAccountAddress: Hex;
  eoaAddress: Hex;
  dbCorrected: boolean;
};

/**
 * Derive the GoClaim account from the stored wallet key.
 * This is the only address that must be passed to Identity.connectAccount.
 */
export async function resolveGoClaimAccount(
  userId: string
): Promise<ResolvedGoClaimAccount | null> {
  const wallet = await prisma.goClaimWallet.findUnique({ where: { userId } });
  if (!wallet) return null;

  const privateKey = decryptPrivateKey(
    wallet.encryptedPrivateKey,
    wallet.iv
  ) as Hex;
  const privateKeyHex = (
    privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  ) as Hex;

  const derived = await deriveGoClaimAccount(privateKeyHex);

  const dbAddress = wallet.goClaimAccountAddress.toLowerCase();
  const derivedAddress = derived.goClaimAccountAddress.toLowerCase();
  let dbCorrected = false;

  if (
    dbAddress !== derivedAddress ||
    wallet.eoaAddress.toLowerCase() !== derived.eoaAddress.toLowerCase()
  ) {
    await prisma.goClaimWallet.update({
      where: { userId },
      data: {
        goClaimAccountAddress: derived.goClaimAccountAddress,
        eoaAddress: derived.eoaAddress,
      },
    });
    dbCorrected = true;
  }

  return {
    goClaimAccountAddress: derived.goClaimAccountAddress,
    eoaAddress: derived.eoaAddress,
    dbCorrected,
  };
}
