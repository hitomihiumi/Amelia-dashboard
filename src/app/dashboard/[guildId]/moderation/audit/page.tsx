import React from "react";
import { getServerSession } from "next-auth";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { AuditSettings } from "@/lib/db/types";
import { DEFAULT_AUDIT_SETTINGS } from "@/lib/db/types";
import { getT } from "@/i18n/server";
import { AuditForm } from "./AuditForm";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const t = await getT();
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
        e instanceof Error ? e.message : t("moderation.errors.loadServerData");
    }
  }

  const guild = new Guild(guildId);

  const settings: AuditSettings = {
    ...DEFAULT_AUDIT_SETTINGS,
    enabled: Boolean(await guild.get("audit.enabled")),
    channel: (await guild.get("audit.channel")) as string | null,
    ignore_channels: ((await guild.get("audit.ignore_channels")) ??
      []) as string[],
    ignore_roles: ((await guild.get("audit.ignore_roles")) ?? []) as string[],
    ignore_bots: Boolean(await guild.get("audit.ignore_bots")),
    webhook: {
      name: (await guild.get("audit.webhook.name")) as string | null,
      avatar: (await guild.get("audit.webhook.avatar")) as string | null,
    },
    categories: ((await guild.get("audit.categories")) ??
      {}) as AuditSettings["categories"],
    events: ((await guild.get("audit.events")) ??
      {}) as AuditSettings["events"],
  };

  return (
    <Flex direction="column" gap="24">
      <PageHeader
        title={t("moderation.audit.title")}
        description={t("moderation.audit.description")}
      />

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title={t("moderation.errors.sessionExpiredTitle")}
            description={t("moderation.errors.sessionExpiredText")}
          />
        ) : (
          <Feedback
            variant="danger"
            title={t("moderation.errors.genericTitle")}
            description={loadError}
          />
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
