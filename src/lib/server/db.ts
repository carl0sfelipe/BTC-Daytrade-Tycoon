/**
 * Shared PrismaClient instance (SQLite via better-sqlite3 driver adapter).
 * Cached on globalThis so Next.js dev hot-reloads don't open new connections
 * on every recompile — standard Prisma + Next.js pattern.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_SQLITE_URL = "file:./prisma/dev.db";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? DEFAULT_SQLITE_URL,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prismaSingleton?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prismaSingleton ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaSingleton = prisma;
}
