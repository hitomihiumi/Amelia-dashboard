"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Column,
  Feedback,
  Grid,
  Input,
  Row,
  SegmentedControl,
  Text,
  Textarea,
  useToast,
  Switch,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { GuildActionState } from "@/types/dashboard";
import type { AiLimits, AiModelChoice, AiSettings } from "@/lib/db/types";
import { AI_MODEL_CHOICES, AI_PERSONA_MAX_LENGTH, limitBounds } from "@/lib/db/types";
import { useT } from "@/i18n/client";
import { updateAiSettings } from "./actions";

const LIMIT_FIELDS = ["user_per_minute", "user_per_day", "guild_per_day"] as const;

export function AiForm({
  guildId,
  defaultSettings,
  textChannels,
  caps,
}: {
  guildId: string;
  defaultSettings: AiSettings;
  textChannels: ChannelPickOption[];
  /** Highest limits the bot's administrators let a server set. */
  caps: AiLimits;
}) {
  const bounds = limitBounds(caps);
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [ai, setAi] = useState(defaultSettings);
  const [baseline, setBaseline] = useState(defaultSettings);

  const isDirty = useMemo(() => JSON.stringify(ai) !== JSON.stringify(baseline), [ai, baseline]);

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const channelOptions = useMemo(
    () =>
      textChannels.map((channel) => ({
        label: <ChannelPill channel={channel} />,
        value: channel.id,
      })),
    [textChannels],
  );

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("ai", JSON.stringify(ai));

    const result: GuildActionState = await updateAiSettings(guildId, fd);

    if (result?.ok) {
      setBaseline(ai);
      addToast({ message: t("ai.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result?.error || t("ai.errors.saveFailed"), variant: "danger" });
    }
  }, [guildId, ai, router, addToast, t]);

  const handleCancel = useCallback(() => setAi(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const update = (patch: Partial<AiSettings>) => setAi((prev) => ({ ...prev, ...patch }));

  const updateLimit = (field: keyof AiLimits, raw: string) => {
    const value = Number.parseInt(raw, 10);
    setAi((prev) => ({
      ...prev,
      limits: { ...prev.limits, [field]: Number.isNaN(value) ? 0 : value },
    }));
  };

  const limitInvalid = (field: keyof AiLimits) => {
    const { min, max } = bounds[field];
    const value = ai.limits[field];
    return !Number.isInteger(value) || value < min || value > max;
  };

  return (
    <SectionGrid>
      <Section
        title={t("ai.general.title")}
        description={t("ai.general.description")}
        span="full"
        num={1}
        icon="navAi"
        switcher={<Switch checked={ai.enabled} onToggle={() => update({ enabled: !ai.enabled })} />}
      >
        <Grid
          fillWidth
          gap="24"
          minWidth={0}
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            alignItems: "start",
          }}
        >
          <Column gap="16" minWidth={0}>
            <ChannelSelect
              fillWidth
              multiple
              id="ai-channels"
              label={t("ai.general.channels")}
              description={t("ai.general.channelsHint")}
              options={channelOptions}
              selectedChannel={ai.channels}
              setSelectedChannel={(value) => update({ channels: value as string[] })}
            />

            <ChannelSelect
              fillWidth
              multiple
              id="ai-ignore-channels"
              label={t("ai.general.ignoredChannels")}
              description={t("ai.general.ignoredChannelsHint")}
              options={channelOptions}
              selectedChannel={ai.ignore_channels}
              setSelectedChannel={(value) => update({ ignore_channels: value as string[] })}
            />
          </Column>

          <Column gap="16" minWidth={0}>
            <Feedback
              variant="info"
              title={t("ai.general.triggersTitle")}
              description={t("ai.general.triggersText")}
            />
            <Feedback
              variant="warning"
              title={t("ai.general.privacyTitle")}
              description={t("ai.general.privacyText")}
            />
          </Column>
        </Grid>
      </Section>

      <Section
        title={t("ai.model.title")}
        description={t("ai.model.description")}
        num={2}
        icon="navAi"
      >
        <SegmentedControl
          fillWidth
          value={ai.model}
          onChange={(value) => update({ model: value as AiModelChoice })}
          buttons={AI_MODEL_CHOICES.map((choice) => ({
            label: t(`ai.model.options.${choice}`),
            value: choice,
          }))}
        />
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t(`ai.model.hints.${ai.model}`)}
        </Text>
      </Section>

      <Section
        title={t("ai.limits.title")}
        description={t("ai.limits.description")}
        num={3}
        icon="navAi"
      >
        <Column gap="16" fillWidth>
          {LIMIT_FIELDS.map((field) => {
            const { min, max } = bounds[field];
            return (
              <Input
                key={field}
                id={`ai-limit-${field}`}
                type="number"
                label={t(`ai.limits.${field}`)}
                value={String(ai.limits[field])}
                min={min}
                max={max}
                error={limitInvalid(field)}
                errorMessage={limitInvalid(field) ? t("ai.limits.range", { min, max }) : undefined}
                onChange={(e) => updateLimit(field, e.target.value)}
              />
            );
          })}
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("ai.limits.note")}
          </Text>
        </Column>
      </Section>

      <Section
        title={t("ai.persona.title")}
        description={t("ai.persona.description")}
        span="full"
        num={4}
        icon="navAi"
      >
        <Column gap="12" fillWidth>
          <Textarea
            id="ai-persona"
            label={t("ai.persona.label")}
            placeholder={t("ai.persona.placeholder")}
            lines={6}
            maxLength={AI_PERSONA_MAX_LENGTH}
            characterCount
            value={ai.persona ?? ""}
            onChange={(e) => update({ persona: e.target.value || null })}
          />
          <Row fillWidth>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("ai.persona.hint")}
            </Text>
          </Row>
        </Column>
      </Section>
    </SectionGrid>
  );
}
