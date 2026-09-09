import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

/** pg currently aliases sslmode=require to verify-full and warns; pin verify-full. */
function withVerifyFullSsl(connectionString: string): string {
  if (/[?&]sslmode=/i.test(connectionString)) {
    return connectionString.replace(/([?&]sslmode=)[^&]*/i, "$1verify-full");
  }
  const sep = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${sep}sslmode=verify-full`;
}

function createPrismaClient(): PrismaClient {
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString: withVerifyFullSsl(process.env.DATABASE_URL ?? ""),
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
