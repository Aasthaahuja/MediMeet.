import { PrismaClient } from "@prisma/client";

// Ensure a single Prisma instance is used during development
const globalForPrisma = globalThis;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
