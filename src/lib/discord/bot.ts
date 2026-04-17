import { prisma } from "@/lib/db/db";
import { fetchDiscordUserGuildsWithRetry, mergeGuildsWithBotPresence } from "./guilds-api";

export async function getUserDashboardGuilds(accessToken: string) {
  const discordGuilds = await fetchDiscordUserGuildsWithRetry(accessToken);

  const discordGuildIds = discordGuilds.map((guild) => guild.id);

  const existingDbGuilds = await prisma.guild.findMany({
    where: {
      id: {
        in: discordGuildIds,
      },
    },
    select: {
      id: true,
    },
  });

  const botGuildIds = new Set(existingDbGuilds.map((g) => g.id));

  const userGuildCards = mergeGuildsWithBotPresence(
    discordGuilds,
    botGuildIds,
    process.env.DISCORD_CLIENT_ID!,
    "295749283071",
  );

  return userGuildCards;
}
