import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { MongoClient } from "mongodb";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.NODE_ENV === "development" ? process.env.DEV_DATABASE_URL : process.env.DATABASE_URL || "" },
      { schema: "public" },
    ),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const globalForMongo = globalThis as unknown as {
  mongo: MongoClient | undefined;
};
export const mongoClient = globalForMongo.mongo ?? new MongoClient(process.env.NODE_ENV === "development" ? process.env.DEV_MONGO_URI || "" : process.env.MONGO_URI || "");
if (process.env.NODE_ENV !== "production") globalForMongo.mongo = mongoClient;
