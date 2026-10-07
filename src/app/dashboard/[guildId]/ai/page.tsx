import React from "react";
import { getServerSession } from "next-auth";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { AiSettings } from "@/lib/db/types";
import { DEFAULT_AI_LIMITS, DEFAULT_AI_SETTINGS } from "@/lib/db/types";
import { getT } from "@/i18n/server";
import { AiForm } from "./AiForm";

export default async function AiPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const t = await getT();
  const session = await getServerSession(authOptions);

  let textChannels: ChannelPickOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      textChannels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("ai.errors.loadChannels");
    }
  }

  const guild = new Guild(guildId);
  const raw = ((await guild.get("ai")) ?? {}) as Partial<AiSettings>;

  const settings: AiSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...raw,
    channels: raw.channels ?? [],
    ignore_channels: raw.ignore_channels ?? [],
    persona: raw.persona ?? null,
    limits: { ...DEFAULT_AI_LIMITS, ...(raw.limits ?? {}) },
  };

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("ai.title")} description={t("ai.description")} />

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title={t("settings.shared.sessionExpiredTitle")}
            description={t("settings.shared.sessionExpiredText")}
          />
        ) : (
          <Feedback variant="danger" title={t("ai.errors.genericTitle")} description={loadError} />
        ))}

      <AiForm guildId={guildId} defaultSettings={settings} textChannels={textChannels} />
    </Flex>
  );
}
