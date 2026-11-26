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

  // Discord (channels + roles) and the database are independent: load them together.
  const loadDiscord = async () => {
    if (!session?.accessToken) return null;
    try {
      const [channelList, list] = await Promise.all([
        fetchGuildTextChannels(session.accessToken, guildId),
        fetchGuildRoles(session.accessToken, guildId),
      ]);
      return {
        textChannels: channelList as ChannelPickOption[],
        roles: list.map(({ id, name, color }) => ({ id, name, color })) as DiscordRole[],
        loadError: null as string | null,
      };
    } catch (e) {
      return {
        textChannels: [] as ChannelPickOption[],
        roles: [] as DiscordRole[],
        loadError: e instanceof Error ? e.message : t("moderation.errors.loadServerData"),
      };
    }
  };

  const guild = new Guild(guildId);

  const [discord, stored] = await Promise.all([
    loadDiscord(),
    guild.getMany([
      "audit.enabled",
      "audit.channel",
      "audit.ignore_channels",
      "audit.ignore_roles",
      "audit.ignore_bots",
      "audit.webhook.name",
      "audit.webhook.avatar",
      "audit.categories",
      "audit.events",
    ]),
  ]);
  const textChannels = discord?.textChannels ?? [];
  const roles = discord?.roles ?? [];
  const loadError = discord?.loadError ?? null;
  const [
    auditEnabled,
    auditChannel,
    auditIgnoreChannels,
    auditIgnoreRoles,
    auditIgnoreBots,
    webhookName,
    webhookAvatar,
    auditCategories,
    auditEvents,
  ] = stored;

  const settings: AuditSettings = {
    ...DEFAULT_AUDIT_SETTINGS,
    enabled: Boolean(auditEnabled),
    channel: auditChannel as string | null,
    ignore_channels: (auditIgnoreChannels ?? []) as string[],
    ignore_roles: (auditIgnoreRoles ?? []) as string[],
    ignore_bots: Boolean(auditIgnoreBots),
    webhook: {
      name: webhookName as string | null,
      avatar: webhookAvatar as string | null,
    },
    categories: (auditCategories ?? {}) as AuditSettings["categories"],
    events: (auditEvents ?? {}) as AuditSettings["events"],
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
