import "server-only";
import { prisma } from "@/lib/db/db";
import { fetchDiscordUserGuilds, guildIconUrl } from "@/lib/discord/guilds-api";
import type { DiscordPartialGuild } from "@/types/discord";

export const SNOWFLAKE = /^\d{17,20}$/;

export interface SlotsSettings {
  min: number;
  max: number;
  /** Seconds between two spins of the same member. */
  cooldown: number;
}

export interface SlotsCurrency {
  emoji: string | null;
  id: string | null;
}

export interface SlotsGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  settings: SlotsSettings;
  currency: SlotsCurrency;
  wallet: number;
}

/** A server the member is on and Amelia is on, or `null`. */
export async function findMemberGuild(
  accessToken: string,
  guildId: string,
): Promise<DiscordPartialGuild | null> {
  const guilds = await fetchDiscordUserGuilds(accessToken);
  return guilds.find((g) => g.id === guildId) ?? null;
}

/** Servers the member is on that have the slot machine turned on, with the member's balance. */
export async function listSlotsGuilds(accessToken: string, userId: string): Promise<SlotsGuild[]> {
  const discordGuilds = await fetchDiscordUserGuilds(accessToken);
  const ids = discordGuilds.map((g) => g.id);
  if (ids.length === 0) return [];

  const [guilds, users] = await Promise.all([
    prisma.guild.findMany({
      where: { id: { in: ids }, slotsEnabled: true },
      select: {
        id: true,
        slotsMinBet: true,
        slotsMaxBet: true,
        slotsCooldown: true,
        currencyEmoji: true,
        currencyId: true,
      },
    }),
    prisma.user.findMany({
      where: { userId, guildId: { in: ids } },
      select: { guildId: true, wallet: true },
    }),
  ]);

  const wallets = new Map(users.map((u) => [u.guildId, u.wallet]));
  const byId = new Map(discordGuilds.map((g) => [g.id, g]));

  return guilds
    .flatMap((guild): SlotsGuild[] => {
      const discord = byId.get(guild.id);
      if (!discord) return [];
      return [
        {
          id: guild.id,
          name: discord.name,
          iconUrl: guildIconUrl(discord.id, discord.icon),
          settings: {
            min: guild.slotsMinBet,
            max: guild.slotsMaxBet,
            cooldown: guild.slotsCooldown,
          },
          currency: { emoji: guild.currencyEmoji, id: guild.currencyId },
          wallet: wallets.get(guild.id) ?? 0,
        },
      ];
    })
    .sort((a, b) => b.wallet - a.wallet || a.name.localeCompare(b.name));
}
