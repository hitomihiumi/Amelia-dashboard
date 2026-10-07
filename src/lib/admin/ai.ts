import "server-only";

import { prisma } from "@/lib/db/db";
import { fetchGuildBrief } from "@/lib/discord/rest";
import {
  type AiGlobalConfig,
  DEFAULT_AI_GLOBAL_CONFIG,
  isPremiumActive,
  normalizeGlobalConfig,
} from "@/lib/db/types";

/**
 * The AI limits administrators set for every server, from the single `AiConfig` row.
 * Missing or out-of-range numbers read as the defaults.
 */
export async function getAiGlobalConfig(): Promise<AiGlobalConfig> {
  const row = await prisma.aiConfig.findUnique({ where: { id: "global" } });
  return normalizeGlobalConfig(row, DEFAULT_AI_GLOBAL_CONFIG);
}

export interface PremiumGuildRow {
  id: string;
  /** From Discord, when the bot is on the server and the token is configured. */
  name: string | null;
  iconUrl: string | null;
  /** ISO date, `null` when premium has no end. */
  until: string | null;
  note: string | null;
  /** Switched on and not past its end date. */
  active: boolean;
}

const MAX_ROWS = 200;

/** Servers that have (or had, and have not been cleaned up) premium, newest change first. */
export async function listPremiumGuilds(): Promise<PremiumGuildRow[]> {
  const rows = await prisma.guild.findMany({
    where: { premium: true },
    select: { id: true, premiumUntil: true, premiumNote: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_ROWS,
  });

  const briefs = await Promise.all(rows.map((row) => fetchGuildBrief(row.id).catch(() => null)));

  return rows.map((row, index) => ({
    id: row.id,
    name: briefs[index]?.name ?? null,
    iconUrl: briefs[index]?.iconUrl ?? null,
    until: row.premiumUntil ? row.premiumUntil.toISOString() : null,
    note: row.premiumNote,
    active: isPremiumActive({ enabled: true, until: row.premiumUntil }),
  }));
}
