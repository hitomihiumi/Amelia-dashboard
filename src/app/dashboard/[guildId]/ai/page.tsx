import React from "react";
import { getServerSession } from "next-auth";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { prisma } from "@/lib/db/db";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { AiSettings } from "@/lib/db/types";
import {
  DEFAULT_AI_LIMITS,
  DEFAULT_AI_SETTINGS,
  clampLimits,
  isPremiumActive,
  normalizeAiOptions,
} from "@/lib/db/types";
import { getAiGlobalConfig } from "@/lib/admin/ai";
import { getT } from "@/i18n/server";
import { AiForm } from "./AiForm";

export default async function AiPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const t = await getT();
  const session = await getServerSession(authOptions);

  const guild = new Guild(guildId);
  const premium = await guild.get("premium");

  // The AI chat is a premium feature, handed out by the bot's administrators.
  if (!isPremiumActive(premium)) {
    return (
      <Flex direction="column" gap="24">
        <PageHeader title={t("ai.title")} description={t("ai.description")} />
        <Feedback
          variant="info"
          title={t("ai.premium.requiredTitle")}
          description={t("ai.premium.requiredText")}
        />
      </Flex>
    );
  }

  let textChannels: ChannelPickOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      textChannels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("ai.errors.loadChannels");
    }
  }

  const { caps } = await getAiGlobalConfig();
  const raw = ((await guild.get("ai")) ?? {}) as Partial<AiSettings>;

  const settings: AiSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...raw,
    channels: raw.channels ?? [],
    ignore_channels: raw.ignore_channels ?? [],
    persona: raw.persona ?? null,
    // What really applies: a limit above the administrators' ceiling is brought down to it.
    limits: clampLimits({ ...DEFAULT_AI_LIMITS, ...(raw.limits ?? {}) }, caps),
    options: normalizeAiOptions(raw.options),
  };
  const memoryCount = await prisma.aiMemory.count({ where: { guildId } });

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

      <Feedback
        variant="success"
        title={t("ai.premium.activeTitle")}
        description={
          premium.until
            ? t("ai.premium.activeUntil", {
                date: new Date(premium.until).toISOString().slice(0, 10),
              })
            : t("ai.premium.activeForever")
        }
      />

      <AiForm
        guildId={guildId}
        defaultSettings={settings}
        textChannels={textChannels}
        caps={caps}
        memoryCount={memoryCount}
      />
    </Flex>
  );
}
