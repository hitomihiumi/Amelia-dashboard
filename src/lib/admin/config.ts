import "server-only";

import { cache } from "react";
import type { GlobalConfig } from "@prisma/client";
import { prisma } from "@/lib/db/db";

import { CONFIG_DEFAULTS, type ServiceOverride } from "./defaults";

// Re-exported so existing imports keep working; the values live in a client-safe module.
export { CONFIG_DEFAULTS };
export type { ServiceOverride };

/**
 * The single configuration row, created on first access.
 * Cached per request so a page can read it from several components.
 */
export const getGlobalConfig = cache(async (): Promise<GlobalConfig> => {
  // Read first: every public page renders this, and an upsert would mean a
  // write on each of them.
  const existing = await prisma.globalConfig.findUnique({ where: { id: "global" } });
  if (existing) return existing;

  return await prisma.globalConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
});

/** Manual per-service overrides set in the admin panel. */
export function serviceOverrides(config: GlobalConfig): Record<string, ServiceOverride> {
  const raw = config.serviceOverrides;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return raw as Record<string, ServiceOverride>;
}
