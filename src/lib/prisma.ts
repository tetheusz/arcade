import { PrismaClient } from "@prisma/client";

declare global {
  var __arcBuilderPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__arcBuilderPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__arcBuilderPrisma = prisma;
}
