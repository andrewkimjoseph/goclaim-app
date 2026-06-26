import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex) {
    throw new Error("Missing ENCRYPTION_MASTER_KEY");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be 32 bytes (64 hex chars)");
  }
  return key;
}

export function encryptPrivateKey(privateKey: string): {
  encrypted: string;
  iv: string;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
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

export function decryptPrivateKey(encrypted: string, iv: string): string {
  const data = Buffer.from(encrypted, "hex");
  const tag = data.subarray(data.length - 16);
  const encryptedKey = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encryptedKey),
    decipher.final(),
  ]).toString("utf8");
}
