import { Guild } from "@/lib/db/Guild";
import { LevelsForm } from "./LevelsForm";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { DiscordRole } from "@/lib/discord/role-style";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGuildTextVoiceAndCategories } from "@/lib/discord/channels-api";
import { ChannelPickOption } from "@/lib/discord/channel-type";
import { Feedback, Flex, RevealFx, Text } from "@once-ui-system/core";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import React from "react";

export default async function LevelsSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  let voiceChannels: ChannelPickOption[] = [];
  let textChannels: ChannelPickOption[] = [];
  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
      const bundle = await fetchGuildTextVoiceAndCategories(session.accessToken, guildId);
      voiceChannels = bundle.voiceChannels.map((c) => ({ ...c }));
      textChannels = bundle.textChannels.map((c) => ({ ...c }));
    } catch (e) {
      loadError =
        e instanceof Error
          ? e.message
          : "An unknown error occurred while loading channels and roles.";
    }
  }

  const guild = new Guild(guildId);

  // Загружаем данные согласно схеме [cite: 1, 4]
  const levels = await guild.get("utils.levels");
  const levelUpEconomy = await guild.get("economy.income.level_up");

  return (
    <Flex direction="column" gap="24">
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">Leveling System</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Manage experience gain, automated role rewards, and level-up announcements.
        </Text>
      </RevealFx>

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title="Session expired"
            description="Your Discord session has expired. Please log in again."
          />
        ) : (
          <Feedback variant="danger" title="Error" description={loadError} />
        ))}

      <LevelsForm
        guildId={guildId}
        defaultLevels={levels}
        defaultEconomy={levelUpEconomy}
        voiceChannels={voiceChannels}
        textChannels={textChannels}
        roles={roles}
      />
    </Flex>
  );
}
