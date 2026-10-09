import "server-only";
import { prisma } from "@/lib/db/db";
import { fetchDiscordUserGuilds, guildIconUrl } from "@/lib/discord/guilds-api";
import { type Appearance, appearanceFromRow } from "./appearance";

export interface ProfileStats {
  level: number;
  /** XP inside the current level. */
  xp: number;
  totalXp: number;
  /** Milliseconds. */
  voiceTime: number;
  messageCount: number;
  wallet: number;
  bank: number;
}

export interface ProfileGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  /** The member has sent a message, spent time in voice or otherwise has a row on the server. */
  hasData: boolean;
  stats: ProfileStats;
  /** Place in the server's XP ranking, `null` while the member has no data there. */
  rank: number | null;
  /** How many members of the server have a ranking. */
  ranked: number;
  appearance: Appearance;
}

export interface ProfileTotals {
  servers: number;
  activeServers: number;
  messages: number;
  voiceTime: number;
  totalXp: number;
  money: number;
  topLevel: number;
  bestRank: number | null;
}

const EMPTY_STATS: ProfileStats = {
  level: 1,
  xp: 0,
  totalXp: 0,
  voiceTime: 0,
  messageCount: 0,
  wallet: 0,
  bank: 0,
};

/** Servers the member is on AND the bot is on, with what the bot knows about them there. */
export async function getProfileGuilds(
  accessToken: string,
  userId: string,
): Promise<ProfileGuild[]> {
  const discordGuilds = await fetchDiscordUserGuilds(accessToken);
  const ids = discordGuilds.map((g) => g.id);

  const [botGuilds, rows] = await Promise.all([
    prisma.guild.findMany({ where: { id: { in: ids } }, select: { id: true } }),
    prisma.user.findMany({ where: { userId, guildId: { in: ids } } }),
  ]);

  const botIds = new Set(botGuilds.map((g) => g.id));
  const rowByGuild = new Map(rows.map((r) => [r.guildId, r]));

  const guilds = await Promise.all(
    discordGuilds
      .filter((g) => botIds.has(g.id))
      .map(async (g): Promise<ProfileGuild> => {
        const row = rowByGuild.get(g.id);
        const base = {
          id: g.id,
          name: g.name,
          iconUrl: guildIconUrl(g.id, g.icon),
          appearance: appearanceFromRow(row),
        };
        if (!row) {
          return { ...base, hasData: false, stats: EMPTY_STATS, rank: null, ranked: 0 };
        }
        const [ahead, ranked] = await Promise.all([
          prisma.user.count({ where: { guildId: g.id, totalXp: { gt: row.totalXp } } }),
          prisma.user.count({ where: { guildId: g.id } }),
        ]);
        return {
          ...base,
          hasData: true,
          stats: {
            level: row.level,
            xp: row.xp,
            totalXp: row.totalXp,
            voiceTime: row.voiceTime,
            messageCount: row.messageCount,
            wallet: row.wallet,
            bank: row.bank,
          },
          rank: ahead + 1,
          ranked,
        };
      }),
  );

  // Where the member is most active first, servers without any data at the end.
  return guilds.sort(
    (a, b) =>
      Number(b.hasData) - Number(a.hasData) ||
      b.stats.totalXp - a.stats.totalXp ||
      a.name.localeCompare(b.name),
  );
}

export function summarize(guilds: ProfileGuild[]): ProfileTotals {
  const active = guilds.filter((g) => g.hasData);
  return {
    servers: guilds.length,
    activeServers: active.length,
    messages: active.reduce((sum, g) => sum + g.stats.messageCount, 0),
    voiceTime: active.reduce((sum, g) => sum + g.stats.voiceTime, 0),
    totalXp: active.reduce((sum, g) => sum + g.stats.totalXp, 0),
    money: active.reduce((sum, g) => sum + g.stats.wallet + g.stats.bank, 0),
    topLevel: active.reduce((max, g) => Math.max(max, g.stats.level), 0),
    bestRank: active.reduce<number | null>(
      (best, g) => (g.rank !== null && (best === null || g.rank < best) ? g.rank : best),
      null,
    ),
  };
}
