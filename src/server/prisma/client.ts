import { mkdirSync } from "fs";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client/index";

const databaseUrl =
  process.env.DATABASE_URL ??
  `file:${path.join(process.cwd(), ".data", "adventure-checkpoints.sqlite")}`;

process.env.DATABASE_URL = databaseUrl;
mkdirSync(path.dirname(databaseUrl.replace(/^file:/, "")), { recursive: true });

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

export function getPrismaClient() {
  const existingClient = globalForPrisma.prismaClient;

  if (existingClient) {
    return existingClient;
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") { //TODO: need stronger client generation before going live
    globalForPrisma.prismaClient = prisma;
  }

  return prisma;
}
