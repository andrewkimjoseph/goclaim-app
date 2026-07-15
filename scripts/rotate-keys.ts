/**
 * Master key rotation stub — decrypt with OLD_MASTER_KEY, re-encrypt with NEW_MASTER_KEY.
 * Run manually during key rotation windows.
 */
import "@/lib/loadEnv";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function decryptWithKey(encrypted: string, iv: string, hexKey: string): string {
  const masterKey = Buffer.from(hexKey, "hex");
  const data = Buffer.from(encrypted, "hex");
  const tag = data.subarray(data.length - 16);
  const encryptedKey = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    masterKey,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encryptedKey),
    decipher.final(),
  ]).toString("utf8");
}

function encryptWithKey(privateKey: string, hexKey: string) {
  const masterKey = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: Buffer.concat([encrypted, tag]).toString("hex"),
    iv: iv.toString("hex"),
  };
}

async function main() {
  const oldKey = process.env.OLD_MASTER_KEY;
  const newKey = process.env.NEW_MASTER_KEY;
  if (!oldKey || !newKey) {
    throw new Error("Set OLD_MASTER_KEY and NEW_MASTER_KEY");
  }

  const prisma = new PrismaClient();
  const wallets = await prisma.goClaimWallet.findMany();

  for (const wallet of wallets) {
    const privateKey = decryptWithKey(
      wallet.encryptedPrivateKey,
      wallet.iv,
      oldKey
    );
    const { encrypted, iv } = encryptWithKey(privateKey, newKey);
    await prisma.goClaimWallet.update({
      where: { id: wallet.id },
      data: {
        encryptedPrivateKey: encrypted,
        iv,
        keyVersion: "v2",
      },
    });
  }

  console.log(`Rotated ${wallets.length} GoClaim wallet keys`);
  await prisma.$disconnect();
}

main().catch(console.error);
