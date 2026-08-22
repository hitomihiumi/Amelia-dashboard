import { config as loadEnv } from "dotenv";
import type { PrismaConfig } from "prisma";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
} satisfies PrismaConfig;
