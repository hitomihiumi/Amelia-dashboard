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
        e instanceof Error ? e.message : t("moderation.errors.loadServerData");
    }
  }

  const guild = new Guild(guildId);

  const settings = {
    moderation_roles: ((await guild.get("moderation.moderation_roles")) ??
      []) as string[],
    log_channel: (await guild.get("moderation.log_channel")) as string | null,
    dm_notify: Boolean(await guild.get("moderation.dm_notify")),
    warn_expiry: Number((await guild.get("moderation.warn_expiry")) ?? 0),
    warn_thresholds: ((await guild.get("moderation.warn_thresholds")) ??
      []) as WarnThreshold[],
  };

  const autoModeration = (await guild.get(
    "moderation.auto_moderation",
  )) as GuildSchema["moderation"]["auto_moderation"];

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
