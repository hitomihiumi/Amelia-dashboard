"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Button,
  Column,
  Feedback,
  IconButton,
  InlineCode,
  Input,
  Line,
  NumberInput,
  Row,
  SegmentedControl,
  Switch,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import type { GuildSchema, WarnThreshold } from "@/lib/db/types";
import { PunishmentType } from "@/lib/db/types";
import { isLinkIgnored } from "@/lib/moderation/linkPatterns";
import { describeLinkPatternIssue } from "@/lib/moderation/linkPatternMessages";
import { useT } from "@/i18n/client";
import { updateModerationSettings } from "./actions";
import { Section } from "@/components/dashboard/Section";
import { IconName } from "@/resources/icons";

type AutoModeration = GuildSchema["moderation"]["auto_moderation"];

export interface ModerationSettingsState {
  moderation_roles: string[];
  log_channel: string | null;
  dm_notify: boolean;
  warn_expiry: number;
  warn_thresholds: WarnThreshold[];
}

function usePunishmentOptions() {
  const t = useT();

  return [
    { label: t("moderation.punishments.warn"), value: PunishmentType.Warn },
    { label: t("moderation.punishments.mute"), value: PunishmentType.Mute },
    { label: t("moderation.punishments.kick"), value: PunishmentType.Kick },
    { label: t("moderation.punishments.ban"), value: PunishmentType.Ban },
  ];
}

export function ModerationForm({
  guildId,
  defaultSettings,
  defaultAutoModeration,
  textChannels,
  roles,
}: {
  guildId: string;
  defaultSettings: ModerationSettingsState;
  defaultAutoModeration: AutoModeration;
  textChannels: ChannelPickOption[];
  roles: DiscordRole[];
}) {
  const t = useT();
  const punishmentOptions = usePunishmentOptions();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [settings, setSettings] = useState(defaultSettings);
  const [autoMod, setAutoMod] = useState(defaultAutoModeration);
  const [baseline, setBaseline] = useState({
    settings: defaultSettings,
    autoMod: defaultAutoModeration,
  });

  const isDirty = useMemo(
    () =>
      JSON.stringify(settings) !== JSON.stringify(baseline.settings) ||
      JSON.stringify(autoMod) !== JSON.stringify(baseline.autoMod),
    [settings, autoMod, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: <RolePill roleColor={role.color} label={role.name} />,
        value: role.id,
      })),
    [roles],
  );

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
    fd.set("settings", JSON.stringify(settings));
    fd.set("auto_moderation", JSON.stringify(autoMod));

    const result: GuildActionState = await updateModerationSettings(
      guildId,
      fd,
    );

    if (result?.ok) {
      setBaseline({ settings, autoMod });
      addToast({ message: t("moderation.settings.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({
        message: result?.error || t("moderation.errors.saveFailed"),
        variant: "danger",
      });
    }
  }, [guildId, settings, autoMod, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setSettings(baseline.settings);
    setAutoMod(baseline.autoMod);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const addThreshold = () => {
    const used = new Set(settings.warn_thresholds.map((rule) => rule.count));
    let count = 3;
    while (used.has(count)) count += 1;

    setSettings((prev) => ({
      ...prev,
      warn_thresholds: [
        ...prev.warn_thresholds,
        {
          count,
          punishment: { type: PunishmentType.Mute, time: 3600, reason: "" },
        },
      ].sort((a, b) => a.count - b.count),
    }));
  };

  const updateThreshold = (index: number, patch: Partial<WarnThreshold>) =>
    setSettings((prev) => ({
      ...prev,
      warn_thresholds: prev.warn_thresholds.map((rule, i) =>
        i === index ? { ...rule, ...patch } : rule,
      ),
    }));

  const removeThreshold = (index: number) =>
    setSettings((prev) => ({
      ...prev,
      warn_thresholds: prev.warn_thresholds.filter((_, i) => i !== index),
    }));

  return (
    <Column fillWidth gap="24">
      <Section
        title={t("moderation.settings.general.title")}
        description={t("moderation.settings.general.description")}
        icon="shield"
        num={1}
      >
        <RoleSelect
          fillWidth
          multiple
          id="moderation-roles"
          label={t("moderation.settings.general.roles")}
          options={roleOptions}
          selectedRole={settings.moderation_roles}
          setSelectedRole={(value) =>
            setSettings((prev) => ({
              ...prev,
              moderation_roles: value as string[],
            }))
          }
          description={t("moderation.settings.general.rolesHint")}
        />

        <ChannelSelect
          fillWidth
          id="moderation-log"
          label={t("moderation.settings.general.logChannel")}
          options={channelOptions}
          selectedChannel={settings.log_channel ?? ""}
          setSelectedChannel={(value) =>
            setSettings((prev) => ({
              ...prev,
              log_channel: (value as string) || null,
            }))
          }
        />

        <Row fillWidth gap="12" vertical="center">
          <Switch
            checked={settings.dm_notify}
            onToggle={() =>
              setSettings((prev) => ({ ...prev, dm_notify: !prev.dm_notify }))
            }
          />
          <Column gap="4">
            <Text variant="label-default-s">
              {t("moderation.settings.general.dmNotify")}
            </Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("moderation.settings.general.dmNotifyHint")}
            </Text>
          </Column>
        </Row>
      </Section>

      <Section
        title={t("moderation.settings.escalation.title")}
        description={t("moderation.settings.escalation.description")}
        icon="warning"
        num={2}
      >
        <NumberInput
          id="warn-expiry"
          label={t("moderation.settings.escalation.expiry")}
          value={settings.warn_expiry}
          min={0}
          max={365}
          onChange={(value: number) =>
            setSettings((prev) => ({
              ...prev,
              warn_expiry: Number(value) || 0,
            }))
          }
        />

        <Column fillWidth gap="12">
          {settings.warn_thresholds.map((rule, index) => (
            <Accordion
              title={t("moderation.settings.escalation.rule", {
                number: index + 1,
              })}
              key={`${rule.count}-${index}`}
            >
              <Row fillWidth gap="8" vertical="center" wrap>
                <Row
                  fillWidth
                  gap="8"
                  vertical="center"
                  horizontal="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    icon="trash"
                    variant="danger"
                    onClick={() => removeThreshold(index)}
                    tooltip={t("moderation.settings.escalation.removeRule")}
                  />
                </Row>
                <NumberInput
                  id={`threshold-count-${index}`}
                  label={t("moderation.settings.escalation.warns")}
                  value={rule.count}
                  min={1}
                  max={100}
                  onChange={(value: number) =>
                    updateThreshold(index, { count: Number(value) || 1 })
                  }
                />
                <SegmentedControl
                  fillWidth
                  buttons={punishmentOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={rule.punishment.type}
                  onChange={(value) =>
                    updateThreshold(index, {
                      punishment: {
                        ...rule.punishment,
                        type: value as PunishmentType,
                      },
                    })
                  }
                />
                <NumberInput
                  id={`threshold-time-${index}`}
                  label={t("moderation.settings.escalation.duration")}
                  value={rule.punishment.time}
                  min={0}
                  max={2419200}
                  onChange={(value: number) =>
                    updateThreshold(index, {
                      punishment: {
                        ...rule.punishment,
                        time: Number(value) || 0,
                      },
                    })
                  }
                />
              </Row>
            </Accordion>
          ))}

          {settings.warn_thresholds.length === 0 && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("moderation.settings.escalation.empty")}
            </Text>
          )}

          <Row fillWidth horizontal="start">
            <Button
              prefixIcon="plus"
              variant="secondary"
              onClick={addThreshold}
              disabled={settings.warn_thresholds.length >= 10}
            >
              {t("moderation.settings.escalation.addRule")}
            </Button>
          </Row>
        </Column>
      </Section>

      <AutoModerationSection
        title={t("moderation.settings.invite.title")}
        description={t("moderation.settings.invite.description")}
        rule={autoMod.invite}
        onChange={(next) => setAutoMod((prev) => ({ ...prev, invite: next }))}
        roleOptions={roleOptions}
        channelOptions={channelOptions}
        num={4}
        icon="invite"
      />

      <AutoModerationSection
        title={t("moderation.settings.links.title")}
        description={t("moderation.settings.links.description")}
        rule={autoMod.links}
        onChange={(next) => setAutoMod((prev) => ({ ...prev, links: next }))}
        roleOptions={roleOptions}
        channelOptions={channelOptions}
        num={5}
        whitelist
        icon="link"
      />
    </Column>
  );
}

type AutoModRule = AutoModeration["links"];

function AutoModerationSection({
  title,
  description,
  rule,
  onChange,
  roleOptions,
  channelOptions,
  num,
  icon,
  whitelist = false,
}: {
  title: string;
  description: string;
  rule: AutoModeration["invite"] | AutoModeration["links"];
  onChange: (next: any) => void;
  roleOptions: { label: React.ReactNode; value: string }[];
  channelOptions: { label: React.ReactNode; value: string }[];
  num: number;
  icon: IconName;
  whitelist?: boolean;
}) {
  const t = useT();
  const punishmentOptions = usePunishmentOptions();
  const linkRule = rule as AutoModRule;

  const update = (patch: Record<string, unknown>) =>
    onChange({ ...rule, ...patch });

  return (
    <Section
      title={title}
      description={description}
      num={num}
      icon={icon}
      switcher={
        <Switch
          checked={rule.enabled}
          onToggle={() => update({ enabled: !rule.enabled })}
        />
      }
    >
      <Row fillWidth gap="12" vertical="center">
        <Switch
          checked={rule.delete_message}
          onToggle={() => update({ delete_message: !rule.delete_message })}
        />
        <Text variant="label-default-s">
          {t("moderation.settings.autoMod.deleteMessage")}
        </Text>
      </Row>

      <Row fillWidth gap="12" vertical="center">
        <Switch
          checked={rule.moderation_immune}
          onToggle={() =>
            update({ moderation_immune: !rule.moderation_immune })
          }
        />
        <Text variant="label-default-s">
          {t("moderation.settings.autoMod.moderatorsExempt")}
        </Text>
      </Row>

      <ChannelSelect
        fillWidth
        multiple
        id={`${title}-ignore-channels`}
        label={t("moderation.settings.autoMod.ignoredChannels")}
        options={channelOptions}
        selectedChannel={rule.ignore_channels}
        setSelectedChannel={(value) =>
          update({ ignore_channels: value as string[] })
        }
      />

      <RoleSelect
        fillWidth
        multiple
        id={`${title}-ignore-roles`}
        label={t("moderation.settings.autoMod.ignoredRoles")}
        options={roleOptions}
        selectedRole={rule.ignore_roles}
        setSelectedRole={(value) => update({ ignore_roles: value as string[] })}
      />

      {whitelist && (
        <LinkWhitelist
          patterns={linkRule.ignore_links}
          onChange={(next) => update({ ignore_links: next })}
        />
      )}

      <Line />

      <Column fillWidth gap="12">
        <Text variant="label-default-s">
          {t("moderation.settings.autoMod.punishment")}
        </Text>
        <SegmentedControl
          fillWidth
          buttons={punishmentOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={rule.punishment.type}
          onChange={(value) =>
            update({
              punishment: { ...rule.punishment, type: value as PunishmentType },
            })
          }
        />
        <NumberInput
          id={`${title}-punishment-time`}
          label={t("moderation.settings.autoMod.duration")}
          value={rule.punishment.time}
          min={0}
          max={2419200}
          onChange={(value: number) =>
            update({
              punishment: { ...rule.punishment, time: Number(value) || 0 },
            })
          }
        />
        <Input
          id={`${title}-punishment-reason`}
          label={t("moderation.settings.autoMod.reason")}
          value={rule.punishment.reason}
          maxLength={400}
          onChange={(e) =>
            update({
              punishment: { ...rule.punishment, reason: e.target.value },
            })
          }
        />
      </Column>
    </Section>
  );
}

// The pattern syntax stays literal in every language; only the explanation is translated.
const PATTERN_EXAMPLES = [
  ["youtube.com", "domain"],
  ["*.wikipedia.org", "subdomains"],
  ["discord.com/channels/*", "channel"],
  ["*docs*", "contains"],
] as const;

/**
 * Whitelist editor for the link filter.
 *
 * Patterns use one wildcard character (`*`) instead of regular expressions, so
 * they stay readable for server owners. The tester below runs the very same
 * matcher the bot uses.
 */
function LinkWhitelist({
  patterns,
  onChange,
}: {
  patterns: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [probe, setProbe] = useState("");

  const trimmed = draft.trim();
  const draftError = trimmed ? describeLinkPatternIssue(t, trimmed) : null;
  const duplicate =
    trimmed.length > 0 && patterns.includes(trimmed.toLowerCase());

  const probeMatch = probe.trim() ? isLinkIgnored(probe, patterns) : null;

  const addPattern = () => {
    const value = trimmed.toLowerCase();
    if (!value || draftError || duplicate) return;
    onChange([...patterns, value]);
    setDraft("");
  };

  return (
    <Column fillWidth gap="12">
      <Text variant="label-default-s">
        {t("moderation.settings.whitelist.title", {
          count: patterns.length,
          max: 100,
        })}
      </Text>

      <Row fillWidth gap="8" vertical="center">
        <Input
          id="link-whitelist"
          label={t("moderation.settings.whitelist.pattern")}
          value={draft}
          maxLength={200}
          placeholder="youtube.com"
          errorMessage={
            draftError ??
            (duplicate
              ? t("moderation.settings.whitelist.duplicate")
              : undefined)
          }
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          variant="secondary"
          onClick={addPattern}
          disabled={
            !trimmed ||
            Boolean(draftError) ||
            duplicate ||
            patterns.length >= 100
          }
        >
          {t("moderation.settings.whitelist.add")}
        </Button>
      </Row>

      <Accordion title={t("moderation.settings.whitelist.howTitle")}>
        <Column fillWidth gap="8">
          <Text variant="body-default-s" onBackground="neutral-medium">
            {t("moderation.settings.whitelist.howText")}
          </Text>
          {PATTERN_EXAMPLES.map(([pattern, meaning]) => (
            <Row key={pattern} fillWidth gap="8" vertical="center" wrap>
              <InlineCode>{pattern}</InlineCode>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {t(`moderation.settings.whitelist.examples.${meaning}`)}
              </Text>
            </Row>
          ))}
        </Column>
      </Accordion>

      <Row fillWidth gap="8" wrap>
        {patterns.map((pattern) => (
          <Row
            key={pattern}
            gap="4"
            vertical="center"
            padding="4"
            radius="m"
            border={
              probeMatch === pattern ? "success-medium" : "neutral-medium"
            }
          >
            <Text variant="body-default-xs">{pattern}</Text>
            <IconButton
              size="s"
              icon="close"
              variant="ghost"
              onClick={() =>
                onChange(patterns.filter((entry) => entry !== pattern))
              }
            />
          </Row>
        ))}
      </Row>

      <Input
        id="link-whitelist-test"
        label={t("moderation.settings.whitelist.test")}
        value={probe}
        maxLength={400}
        placeholder="https://www.youtube.com/watch?v=1"
        onChange={(e) => setProbe(e.target.value)}
      />

      {probe.trim() &&
        (probeMatch ? (
          <Feedback
            variant="success"
            title={t("moderation.settings.whitelist.allowedTitle")}
            description={t("moderation.settings.whitelist.allowedText", {
              pattern: probeMatch,
            })}
          />
        ) : (
          <Feedback
            variant="warning"
            title={t("moderation.settings.whitelist.moderatedTitle")}
            description={t("moderation.settings.whitelist.moderatedText")}
          />
        ))}
    </Column>
  );
}
