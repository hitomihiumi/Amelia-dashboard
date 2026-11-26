import { Guild } from "@/lib/db/Guild";
import { early } from "@/lib/utils";
import { LevelsForm } from "./LevelsForm";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { DiscordRole } from "@/lib/discord/role-style";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGuildTextVoiceAndCategories } from "@/lib/discord/channels-api";
import { ChannelPickOption } from "@/lib/discord/channel-type";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import React from "react";
import { getT } from "@/i18n/server";
import { normalizeLevelMessage } from "@/lib/levels/message";
import type { GuildSchema } from "@/lib/db/types";

export default async function LevelsSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  let voiceChannels: ChannelPickOption[] = [];
  let textChannels: ChannelPickOption[] = [];
  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  const guild = new Guild(guildId);
  // Started first: the database read overlaps with the Discord requests.
  const storedPromise = early(guild.getMany(["utils.levels", "economy.income.level_up"]));

  if (session?.accessToken) {
    try {
      const [list, bundle] = await Promise.all([
        fetchGuildRoles(session.accessToken, guildId),
        fetchGuildTextVoiceAndCategories(session.accessToken, guildId),
      ]);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
      voiceChannels = bundle.voiceChannels.map((c) => ({ ...c }));
      textChannels = bundle.textChannels.map((c) => ({ ...c }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("settings.shared.loadChannelsRolesFailed");
    }
  }

  const [stored, levelUpEconomy] = (await storedPromise) as [
    GuildSchema["utils"]["levels"],
    GuildSchema["economy"]["income"]["level_up"],
  ];
  // Servers saved before the announcement editor have `{}` or only some of its keys.
  const levels = {
    ...stored,
    message: { ...stored.message, content: normalizeLevelMessage(stored.message?.content) },
  };

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("settings.levels.title")} description={t("settings.levels.description")} />

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title={t("settings.shared.sessionExpiredTitle")}
            description={t("settings.shared.sessionExpiredText")}
          />
        ) : (
          <Feedback
            variant="danger"
            title={t("settings.shared.errorTitle")}
            description={loadError}
          />
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
