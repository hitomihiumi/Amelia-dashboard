import React from "react";
import { getServerSession } from "next-auth";
import { Feedback, Flex, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { AuditSettings } from "@/lib/db/types";
import { DEFAULT_AUDIT_SETTINGS } from "@/lib/db/types";
import { AuditForm } from "./AuditForm";

export default async function AuditPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  let textChannels: ChannelPickOption[] = [];
  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      textChannels = await fetchGuildTextChannels(session.accessToken, guildId);
      const list = await fetchGuildRoles(session.accessToken, guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {
      loadError =
        e instanceof Error ? e.message : "An unknown error occurred while loading server data.";
    }
  }

  const guild = new Guild(guildId);

  const settings: AuditSettings = {
    ...DEFAULT_AUDIT_SETTINGS,
    enabled: Boolean(await guild.get("audit.enabled")),
    channel: (await guild.get("audit.channel")) as string | null,
    ignore_channels: ((await guild.get("audit.ignore_channels")) ?? []) as string[],
    ignore_roles: ((await guild.get("audit.ignore_roles")) ?? []) as string[],
    ignore_bots: Boolean(await guild.get("audit.ignore_bots")),
    webhook: {
      name: (await guild.get("audit.webhook.name")) as string | null,
      avatar: (await guild.get("audit.webhook.avatar")) as string | null,
    },
    events: ((await guild.get("audit.events")) ?? {}) as AuditSettings["events"],
  };

  return (
    <Flex direction="column" gap="24">
      <Flex direction="column" gap="8">
        <Text variant="heading-strong-l">Audit log</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Record what happens on the server — joins, punishments, message edits, voice activity and
          server changes — in a channel of your choice.
        </Text>
      </Flex>

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

      <AuditForm
        guildId={guildId}
        defaultSettings={settings}
        textChannels={textChannels}
        roles={roles}
      />
    </Flex>
  );
}
