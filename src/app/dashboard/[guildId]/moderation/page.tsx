import React from "react";
import { getServerSession } from "next-auth";
import { Feedback, Flex, RevealFx, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildSchema, WarnThreshold } from "@/lib/db/types";
import { ModerationForm } from "./ModerationForm";

export default async function ModerationSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  let textChannels: ChannelPickOption[] = [];
  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
      textChannels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      loadError =
        e instanceof Error ? e.message : "An unknown error occurred while loading server data.";
    }
  }

  const guild = new Guild(guildId);

  const settings = {
    moderation_roles: ((await guild.get("moderation.moderation_roles")) ?? []) as string[],
    log_channel: (await guild.get("moderation.log_channel")) as string | null,
    dm_notify: Boolean(await guild.get("moderation.dm_notify")),
    warn_expiry: Number((await guild.get("moderation.warn_expiry")) ?? 0),
    warn_thresholds: ((await guild.get("moderation.warn_thresholds")) ?? []) as WarnThreshold[],
  };

  const autoModeration = (await guild.get(
    "moderation.auto_moderation",
  )) as GuildSchema["moderation"]["auto_moderation"];

  return (
    <Flex direction="column" gap="24">
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">Moderation</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Configure who can moderate, how punishments escalate and what the bot filters
          automatically.
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

      <ModerationForm
        guildId={guildId}
        defaultSettings={settings}
        defaultAutoModeration={autoModeration}
        textChannels={textChannels}
        roles={roles}
      />
    </Flex>
  );
}
