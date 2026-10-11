import "server-only";

import { prisma } from "@/lib/db/db";
import type { BannerStats } from "@/lib/db/types";
import { botFetch } from "@/lib/discord/rest";
import { SAMPLE_STATS } from "./templates";

export interface BannerContext {
  /** Real numbers where the server has them, examples for the rest. */
  stats: BannerStats;
  /** Which of the numbers in `stats` are real. */
  real: Array<keyof BannerStats>;
  /** Whether the server has the BANNER feature (boost level 2); null when it could not be asked. */
  canHaveBanner: boolean | null;
  boostTier: number | null;
}

function startOfDay(daysAgo = 0): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

interface ApiGuild {
  name: string;
  icon: string | null;
  features: string[];
  premium_tier: number;
  premium_subscription_count?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  roles?: unknown[];
}

/** What the preview of a banner shows: the numbers of the server, as far as they can be known. */
export async function loadBannerContext(guildId: string): Promise<BannerContext> {
  const stats: BannerStats = { ...SAMPLE_STATS };
  const real: Array<keyof BannerStats> = [];

  const [today, week, presence, api] = await Promise.all([
    prisma.guildStat
      .findUnique({ where: { guildId_day: { guildId, day: startOfDay() } } })
      .catch(() => null),
    prisma.guildStat
      .aggregate({
        where: { guildId, day: { gte: startOfDay(6) } },
        _sum: { messages: true },
      })
      .catch(() => null),
    prisma.guildPresence.findUnique({ where: { id: guildId } }).catch(() => null),
    botFetch(`/guilds/${guildId}?with_counts=true`)
      .then(async (res) => (res?.ok ? ((await res.json()) as ApiGuild) : null))
      .catch(() => null),
  ]);

  if (presence) {
    stats.guild_name = presence.name;
    stats.members = presence.memberCount;
    stats.boost_tier = presence.boostTier;
    real.push("guild_name", "members", "boost_tier");
    if (presence.icon) {
      stats.guild_icon = `https://cdn.discordapp.com/icons/${guildId}/${presence.icon}.png?size=512`;
      real.push("guild_icon");
    }
  }

  if (today) {
    stats.messages_today = today.messages;
    stats.joins_today = today.joins;
    stats.leaves_today = today.leaves;
    real.push("messages_today", "joins_today", "leaves_today");
  }
  if (week?._sum.messages !== undefined && week._sum.messages !== null) {
    stats.messages_week = week._sum.messages;
    real.push("messages_week");
  }

  if (api) {
    stats.guild_name = api.name;
    stats.boost_tier = api.premium_tier;
    stats.boosts = api.premium_subscription_count ?? stats.boosts;
    if (typeof api.approximate_member_count === "number")
      stats.members = api.approximate_member_count;
    if (typeof api.approximate_presence_count === "number") {
      stats.members_online = api.approximate_presence_count;
      real.push("members_online");
    }
    if (Array.isArray(api.roles)) {
      stats.roles = Math.max(0, api.roles.length - 1);
      real.push("roles");
    }
    if (api.icon) {
      stats.guild_icon = `https://cdn.discordapp.com/icons/${guildId}/${api.icon}.png?size=512`;
    }
    real.push("guild_name", "members", "boosts", "boost_tier");
  }

  return {
    stats,
    real: [...new Set(real)],
    canHaveBanner: api ? api.features.includes("BANNER") : null,
    boostTier: api ? api.premium_tier : (presence?.boostTier ?? null),
  };
}
