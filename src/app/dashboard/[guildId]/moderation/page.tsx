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
import { readAutoModerationState } from "@/lib/discord/automod";
import type { AutoModKind, GuildSchema, WarnThreshold } from "@/lib/db/types";
import { AUTOMOD_KINDS } from "@/lib/db/types";
import { getT } from "@/i18n/server";
import { type AutoModDisplayState, ModerationForm } from "./ModerationForm";

/**
 * What the page shows next to each rule: the saved settings against what Discord has. Never throws,
 * an unreachable Discord only turns the labels into "cannot check".
 */
async function loadRuleStates(
  guildId: string,
  autoModeration: GuildSchema["moderation"]["auto_moderation"],
): Promise<{
  states: Partial<Record<AutoModKind, AutoModDisplayState>>;
  error: string | null;
}> {
  const states: Partial<Record<AutoModKind, AutoModDisplayState>> = {};
  const created = AUTOMOD_KINDS.filter(
    (kind) => autoModeration[kind]?.enabled && autoModeration.rules?.[kind],
  );

  let report: Awaited<ReturnType<typeof readAutoModerationState>> = {
    states: {},
    error: null,
  };
  if (created.length > 0) {
    try {
      report = await readAutoModerationState(guildId, autoModeration);
    } catch (error) {
      console.error("[Moderation] Reading the AutoMod rules failed:", error);
      report = { states: {}, error: "unknown" };
    }
  }

  for (const kind of AUTOMOD_KINDS) {
    const live = report.states[kind];
    if (!autoModeration[kind]?.enabled || !autoModeration.rules?.[kind]) {
      states[kind] = "off";
    } else {
      states[kind] = report.error || !live ? "unavailable" : live;
    }
  }

  return { states, error: report.error };
}

export default async function ModerationSettingsPage({
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
      const [list, channelList] = await Promise.all([
        fetchGuildRoles(session.accessToken, guildId),
        fetchGuildTextChannels(session.accessToken, guildId),
      ]);
      return {
        roles: list.map(({ id, name, color }) => ({ id, name, color })) as DiscordRole[],
        textChannels: channelList as ChannelPickOption[],
        loadError: null as string | null,
      };
    } catch (e) {
      return {
        roles: [] as DiscordRole[],
        textChannels: [] as ChannelPickOption[],
        loadError: e instanceof Error ? e.message : t("moderation.errors.loadServerData"),
      };
    }
  };

  const guild = new Guild(guildId);

  const [discord, stored] = await Promise.all([
    loadDiscord(),
    guild.getMany([
      "moderation.moderation_roles",
      "moderation.log_channel",
      "moderation.dm_notify",
      "moderation.warn_expiry",
      "moderation.warn_thresholds",
      "moderation.auto_moderation",
    ]),
  ]);
  const textChannels = discord?.textChannels ?? [];
  const roles = discord?.roles ?? [];
  const loadError = discord?.loadError ?? null;
  const [modRoles, logChannel, dmNotify, warnExpiry, warnThresholds, storedAutoMod] = stored;

  const settings = {
    moderation_roles: (modRoles ?? []) as string[],
    log_channel: logChannel as string | null,
    dm_notify: Boolean(dmNotify),
    warn_expiry: Number(warnExpiry ?? 0),
    warn_thresholds: (warnThresholds ?? []) as WarnThreshold[],
  };

  const autoModeration = storedAutoMod as GuildSchema["moderation"]["auto_moderation"];

  const { states: ruleStates, error: autoModError } = await loadRuleStates(
    guildId,
    autoModeration,
  );
  const autoModOn = AUTOMOD_KINDS.some((kind) => autoModeration[kind]?.enabled);

  return (
    <Flex direction="column" gap="24">
      <PageHeader
        title={t("moderation.settings.title")}
        description={t("moderation.settings.description")}
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

      {autoModError === "permissions" && autoModOn && (
        <Feedback
          variant="warning"
          title={t("moderation.settings.autoMod.permissionsTitle")}
          description={t("moderation.settings.autoMod.permissionsText")}
        />
      )}

      <ModerationForm
        guildId={guildId}
        defaultSettings={settings}
        defaultAutoModeration={autoModeration}
        ruleStates={ruleStates}
        textChannels={textChannels}
        roles={roles}
      />
    </Flex>
  );
}
