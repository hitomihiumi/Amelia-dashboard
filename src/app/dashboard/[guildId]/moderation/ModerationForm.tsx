"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Button,
  Checkbox,
  Column,
  Feedback,
  Grid,
  IconButton,
  InlineCode,
  Input,
  Line,
  NumberInput,
  Row,
  SegmentedControl,
  Switch,
  Tag,
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
import type {
  AutoModKind,
  AutoModPreset,
  AutoModRuleBase,
  GuildSchema,
  WarnThreshold,
} from "@/lib/db/types";
import { PunishmentType } from "@/lib/db/types";
import {
  AUTOMOD_LIMITS,
  linkPatternToAllowWords,
  nativeTimeoutSeconds,
} from "@/lib/moderation/autoModeration";
import { isLinkIgnored } from "@/lib/moderation/linkPatterns";
import { describeLinkPatternIssue } from "@/lib/moderation/linkPatternMessages";
import { useT } from "@/i18n/client";
import { updateModerationSettings } from "./actions";
import { Section } from "@/components/dashboard/Section";
import { IconName } from "@/resources/icons";
import styles from "./ModerationForm.module.scss";

// Inner grids follow the width of the card they sit in (not the viewport), so the same markup
// is one column on a phone and two or three side by side inside a wide card.
const autoFit = (min: number): React.CSSProperties => ({
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
  alignItems: "start",
});

const FIELDS_GRID = autoFit(210);
const TOGGLES_GRID: React.CSSProperties = {
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  gap: "var(--static-space-12) var(--static-space-16)",
};

type AutoModeration = GuildSchema["moderation"]["auto_moderation"];

/** What the page tells about a rule next to its switch (the Discord side of it). */
export type AutoModDisplayState =
  | "active"
  | "missing"
  | "off"
  | "unknown"
  | "unavailable";

const STATE_SCHEME = {
  active: "success",
  missing: "danger",
  off: "neutral",
  unknown: "warning",
  unavailable: "neutral",
} as const satisfies Record<AutoModDisplayState, string>;

const PRESETS: AutoModPreset[] = ["profanity", "sexual_content", "slurs"];

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
  ruleStates,
  textChannels,
  roles,
}: {
  guildId: string;
  defaultSettings: ModerationSettingsState;
  defaultAutoModeration: AutoModeration;
  ruleStates: Partial<Record<AutoModKind, AutoModDisplayState>>;
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
      // What Discord refused or shortened (a rule of its own, a limit, a missing permission).
      result.automod?.messages.forEach((message) =>
        addToast({ message, variant: "warning" }),
      );
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

  // One setter per rule kind: merges into the latest state, so an editor never overwrites another.
  const patchRule =
    <K extends AutoModKind>(kind: K) =>
    (patch: Partial<AutoModeration[K]>) =>
      setAutoMod((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));

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
    <Grid fillWidth gap="24" className={styles.layout}>
      <Column gap="24" minWidth={0} className={styles.stack}>
        <Section
          title={t("moderation.settings.general.title")}
          description={t("moderation.settings.general.description")}
          icon="shield"
          num={1}
        >
          <Grid
            fillWidth
            gap="16"
            minWidth={0}
            className={styles.labels}
            style={FIELDS_GRID}
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
          </Grid>

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
            {settings.warn_thresholds.length > 0 && (
              <Grid
                fillWidth
                gap="12"
                minWidth={0}
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                }}
              >
                {settings.warn_thresholds.map((rule, index) => (
                  <Column
                    key={`${rule.count}-${index}`}
                    gap="12"
                    minWidth={0}
                    padding="16"
                    radius="m"
                    border="neutral-medium"
                    background="neutral-alpha-weak"
                  >
                    <Row horizontal="between" vertical="center" gap="8">
                      <Text variant="label-strong-s">
                        {t("moderation.settings.escalation.rule", {
                          number: index + 1,
                        })}
                      </Text>
                      <IconButton
                        icon="trash"
                        variant="danger"
                        size="s"
                        onClick={() => removeThreshold(index)}
                        tooltip={t("moderation.settings.escalation.removeRule")}
                      />
                    </Row>
                    <Grid
                      gap="12"
                      className={styles.labels}
                      style={autoFit(120)}
                    >
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
                    </Grid>
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
                  </Column>
                ))}
              </Grid>
            )}

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
      </Column>

      <Column
        gap="24"
        minWidth={0}
        className={`${styles.stack} ${styles.filters}`}
      >
        <Column gap="24" minWidth={0} className={styles.stack}>
          <AutoModerationSection
            kind="invite"
            rule={autoMod.invite}
            onChange={patchRule("invite")}
            state={ruleStates.invite}
            roleOptions={roleOptions}
            channelOptions={channelOptions}
            num={6}
            icon="invite"
          />

          <AutoModerationSection
            kind="links"
            rule={autoMod.links}
            onChange={patchRule("links")}
            state={ruleStates.links}
            roleOptions={roleOptions}
            channelOptions={channelOptions}
            num={7}
            icon="link"
          >
            <LinkWhitelist
              patterns={autoMod.links.ignore_links}
              onChange={(next) => patchRule("links")({ ignore_links: next })}
            />
          </AutoModerationSection>

          <AutoModerationSection
            kind="keywords"
            rule={autoMod.keywords}
            onChange={patchRule("keywords")}
            state={ruleStates.keywords}
            roleOptions={roleOptions}
            channelOptions={channelOptions}
            num={8}
            icon="text"
            issue={
              autoMod.keywords.keywords.length === 0 &&
              autoMod.keywords.regex.length === 0
                ? t("moderation.automod.issues.keywords_empty", {
                    kind: t("moderation.automod.kinds.keywords"),
                  })
                : null
            }
          >
            <KeywordsEditors
              rule={autoMod.keywords}
              onChange={patchRule("keywords")}
            />
          </AutoModerationSection>
        </Column>

        <Column gap="24" minWidth={0} className={styles.stack}>
          <AutoModerationSection
            kind="profanity"
            rule={autoMod.profanity}
            onChange={patchRule("profanity")}
            state={ruleStates.profanity}
            roleOptions={roleOptions}
            channelOptions={channelOptions}
            num={9}
            icon="eyeoff"
            issue={
              autoMod.profanity.presets.length === 0
                ? t("moderation.settings.profanity.presetsEmpty")
                : null
            }
          >
            <ProfanityEditors
              rule={autoMod.profanity}
              onChange={patchRule("profanity")}
            />
          </AutoModerationSection>

          <AutoModerationSection
            kind="mention_spam"
            rule={autoMod.mention_spam}
            onChange={patchRule("mention_spam")}
            state={ruleStates.mention_spam}
            roleOptions={roleOptions}
            channelOptions={channelOptions}
            num={10}
            icon="megaphone"
          >
            <MentionSpamEditors
              rule={autoMod.mention_spam}
              onChange={patchRule("mention_spam")}
            />
          </AutoModerationSection>

          <AutoModerationSection
            kind="spam"
            rule={autoMod.spam}
            onChange={patchRule("spam")}
            state={ruleStates.spam}
            roleOptions={roleOptions}
            channelOptions={channelOptions}
            num={11}
            icon="warning"
          />
        </Column>
      </Column>
    </Grid>
  );
}

/** Does Discord apply the "mute" punishment itself for this kind of rule? */
function appliesTimeoutNatively(kind: AutoModKind, rule: AutoModRuleBase) {
  return (
    nativeTimeoutSeconds(kind, {
      ...rule,
      punishment: { ...rule.punishment, type: PunishmentType.Mute },
    }) !== null
  );
}

/**
 * One AutoMod rule: the switch with the state of the rule in Discord, what to match (`children`, the
 * part that differs per kind), what happens to the message and who is exempt.
 */
function AutoModerationSection({
  kind,
  rule,
  onChange,
  state,
  roleOptions,
  channelOptions,
  num,
  icon,
  issue,
  children,
}: {
  kind: AutoModKind;
  rule: AutoModRuleBase;
  onChange: (patch: Partial<AutoModRuleBase>) => void;
  state?: AutoModDisplayState;
  roleOptions: { label: React.ReactNode; value: string }[];
  channelOptions: { label: React.ReactNode; value: string }[];
  num: number;
  icon: IconName;
  /** A problem with the rule that Discord would refuse, shown while the rule is on. */
  issue?: string | null;
  children?: React.ReactNode;
}) {
  const t = useT();
  const punishmentOptions = usePunishmentOptions();

  const update = (patch: Partial<AutoModRuleBase>) => onChange(patch);

  const nativeTimeout = appliesTimeoutNatively(kind, rule);
  // Discord wants one action per rule, so a rule without any other action blocks the message.
  const blocks =
    rule.delete_message ||
    (!rule.alert_channel && nativeTimeoutSeconds(kind, rule) === null);

  const alertOptions = [
    {
      label: (
        <Text variant="body-default-m" onBackground="neutral-weak">
          {t("moderation.settings.autoMod.alertNone")}
        </Text>
      ),
      value: "",
    },
    ...channelOptions,
  ];

  const stateHint =
    rule.enabled && (state === "off" || state === "missing" || state === "unknown")
      ? t(`moderation.settings.autoMod.stateHint.${state}`)
      : null;

  return (
    <Section
      title={t(`moderation.settings.${kind}.title`)}
      description={t(`moderation.settings.${kind}.description`)}
      num={num}
      icon={icon}
      switcher={
        <Row gap="12" vertical="center">
          {rule.enabled && state && (
            <Tag scheme={STATE_SCHEME[state]} size="s" radius="full">
              <Text variant="label-default-xs">
                {t(`moderation.automod.state.${state}`)}
              </Text>
            </Tag>
          )}
          <Switch
            checked={rule.enabled}
            onToggle={() => update({ enabled: !rule.enabled })}
          />
        </Row>
      }
    >
      {stateHint && (
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {stateHint}
        </Text>
      )}

      {children}

      {rule.enabled && issue && (
        <Text variant="body-default-xs" onBackground="danger-medium">
          {issue}
        </Text>
      )}

      {children && <Line />}

      <Column fillWidth gap="8">
        <Grid fillWidth minWidth={0} style={TOGGLES_GRID}>
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
        </Grid>

        <Text variant="body-default-xs" onBackground="neutral-weak">
          {t("moderation.settings.autoMod.actionsHint")}
        </Text>
      </Column>

      <Grid
        fillWidth
        gap="16"
        minWidth={0}
        className={styles.labels}
        style={FIELDS_GRID}
      >
        <Input
          id={`${kind}-block-message`}
          label={t("moderation.settings.autoMod.blockMessage")}
          value={rule.block_message ?? ""}
          maxLength={AUTOMOD_LIMITS.blockMessage}
          disabled={!blocks}
          description={
            blocks
              ? t("moderation.settings.autoMod.blockMessageHint", {
                  max: AUTOMOD_LIMITS.blockMessage,
                })
              : t("moderation.settings.autoMod.blockMessageUnused")
          }
          onChange={(e) => update({ block_message: e.target.value || null })}
        />

        <ChannelSelect
          fillWidth
          id={`${kind}-alert-channel`}
          label={t("moderation.settings.autoMod.alertChannel")}
          options={alertOptions}
          placeholder={t("moderation.settings.autoMod.alertNone")}
          selectedChannel={rule.alert_channel ?? ""}
          setSelectedChannel={(value) =>
            update({ alert_channel: (value as string) || null })
          }
          description={t("moderation.settings.autoMod.alertChannelHint")}
        />
      </Grid>

      <Grid
        fillWidth
        gap="16"
        minWidth={0}
        className={styles.labels}
        style={FIELDS_GRID}
      >
        <ChannelSelect
          fillWidth
          multiple
          id={`${kind}-ignore-channels`}
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
          id={`${kind}-ignore-roles`}
          label={t("moderation.settings.autoMod.ignoredRoles")}
          options={roleOptions}
          selectedRole={rule.ignore_roles}
          setSelectedRole={(value) =>
            update({ ignore_roles: value as string[] })
          }
        />
      </Grid>

      <Line />

      <Column fillWidth gap="12">
        <Column fillWidth gap="4">
          <Text variant="label-default-s">
            {t("moderation.settings.autoMod.punishment")}
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {t(
              nativeTimeout
                ? "moderation.settings.autoMod.punishmentNative"
                : "moderation.settings.autoMod.punishmentBot",
            )}
          </Text>
        </Column>
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
        <Grid
          fillWidth
          gap="16"
          minWidth={0}
          className={styles.labels}
          style={FIELDS_GRID}
        >
          <NumberInput
            id={`${kind}-punishment-time`}
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
            id={`${kind}-punishment-reason`}
            label={t("moderation.settings.autoMod.reason")}
            value={rule.punishment.reason}
            maxLength={400}
            onChange={(e) =>
              update({
                punishment: { ...rule.punishment, reason: e.target.value },
              })
            }
          />
        </Grid>
      </Column>
    </Section>
  );
}

/** The saved entries as removable chips. Long lists scroll instead of pushing the page down. */
function ValueChips({
  items,
  onRemove,
  highlight,
}: {
  items: string[];
  onRemove: (item: string) => void;
  highlight?: string | null;
}) {
  const t = useT();
  if (items.length === 0) return null;

  return (
    <Row
      fillWidth
      gap="8"
      wrap
      style={{ maxHeight: 220, overflowY: "auto" }}
    >
      {items.map((item) => (
        <Row
          key={item}
          gap="4"
          vertical="center"
          padding="4"
          radius="m"
          minWidth={0}
          border={highlight === item ? "success-medium" : "neutral-medium"}
        >
          <Text variant="body-default-xs" style={{ overflowWrap: "anywhere" }}>
            {item}
          </Text>
          <IconButton
            size="s"
            icon="close"
            variant="ghost"
            tooltip={t("moderation.settings.list.remove")}
            onClick={() => onRemove(item)}
          />
        </Row>
      ))}
    </Row>
  );
}

const LOOKAROUND = /\(\?<?[=!]/;

/**
 * Editor for a list of words (or patterns) with a counter, the limits Discord has and a hint.
 * Several words can be pasted at once, separated by commas, unless `single` is set (a regular
 * expression may contain commas).
 */
function WordListEditor({
  id,
  label,
  placeholder,
  hint,
  items,
  onChange,
  max,
  maxLength,
  single = false,
  rejectLookaround = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
  max: number;
  maxLength: number;
  single?: boolean;
  rejectLookaround?: boolean;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");

  // Words are matched without regard to case, so "Spam" and "spam" are one entry.
  const norm = (value: string) => (single ? value : value.toLowerCase());
  const entries = (single ? [draft] : draft.split(/[\n,]+/))
    .map((entry) => entry.trim())
    .filter(Boolean);
  const known = new Set(items.map(norm));
  const fresh = entries.filter(
    (entry, index) =>
      !known.has(norm(entry)) &&
      entries.findIndex((other) => norm(other) === norm(entry)) === index,
  );

  let error: string | undefined;
  if (entries.some((entry) => entry.length > maxLength)) {
    error = t("moderation.settings.list.tooLong", { max: maxLength });
  } else if (rejectLookaround && entries.some((e) => LOOKAROUND.test(e))) {
    error = t("moderation.settings.list.lookaround");
  } else if (entries.length > 0 && fresh.length === 0) {
    error = t("moderation.settings.list.duplicate");
  } else if (items.length + fresh.length > max) {
    error = t("moderation.settings.list.full");
  }

  const canAdd = fresh.length > 0 && !error;
  const add = () => {
    if (!canAdd) return;
    onChange([...items, ...fresh]);
    setDraft("");
  };

  return (
    <Column fillWidth gap="8" className={styles.labels}>
      <Row fillWidth vertical="start" gap="8">
        <Column style={{ flex: 1, minWidth: 0 }}>
          <Input
            id={id}
            label={label}
            value={draft}
            placeholder={placeholder}
            errorMessage={error}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              add();
            }}
          />
        </Column>
        <Button variant="secondary" onClick={add} disabled={!canAdd}>
          {t("moderation.settings.list.add")}
        </Button>
      </Row>

      <Text variant="body-default-xs" onBackground="neutral-weak">
        {hint}
      </Text>

      <ValueChips
        items={items}
        onRemove={(item) => onChange(items.filter((entry) => entry !== item))}
      />
    </Column>
  );
}

function KeywordsEditors({
  rule,
  onChange,
}: {
  rule: AutoModeration["keywords"];
  onChange: (patch: Partial<AutoModeration["keywords"]>) => void;
}) {
  const t = useT();

  return (
    <Column fillWidth gap="24">
      <WordListEditor
        id="keywords-words"
        label={t("moderation.settings.keywords.words", {
          count: rule.keywords.length,
          max: AUTOMOD_LIMITS.keywords,
        })}
        placeholder={t("moderation.settings.keywords.wordsPlaceholder")}
        hint={t("moderation.settings.keywords.wordsHint")}
        items={rule.keywords}
        onChange={(keywords) => onChange({ keywords })}
        max={AUTOMOD_LIMITS.keywords}
        maxLength={AUTOMOD_LIMITS.keywordLength}
      />

      <WordListEditor
        id="keywords-regex"
        label={t("moderation.settings.keywords.regex", {
          count: rule.regex.length,
          max: AUTOMOD_LIMITS.regex,
        })}
        placeholder={t("moderation.settings.keywords.regexPlaceholder")}
        hint={t("moderation.settings.keywords.regexHint", {
          max: AUTOMOD_LIMITS.regexLength,
        })}
        items={rule.regex}
        onChange={(regex) => onChange({ regex })}
        max={AUTOMOD_LIMITS.regex}
        maxLength={AUTOMOD_LIMITS.regexLength}
        single
        rejectLookaround
      />

      <WordListEditor
        id="keywords-allow"
        label={t("moderation.settings.keywords.allow", {
          count: rule.allow.length,
          max: AUTOMOD_LIMITS.allow,
        })}
        placeholder={t("moderation.settings.keywords.allowPlaceholder")}
        hint={t("moderation.settings.keywords.allowHint")}
        items={rule.allow}
        onChange={(allow) => onChange({ allow })}
        max={AUTOMOD_LIMITS.allow}
        maxLength={AUTOMOD_LIMITS.keywordLength}
      />
    </Column>
  );
}

function ProfanityEditors({
  rule,
  onChange,
}: {
  rule: AutoModeration["profanity"];
  onChange: (patch: Partial<AutoModeration["profanity"]>) => void;
}) {
  const t = useT();

  const toggle = (preset: AutoModPreset) =>
    onChange({
      presets: PRESETS.filter((id) =>
        id === preset ? !rule.presets.includes(id) : rule.presets.includes(id),
      ),
    });

  return (
    <Column fillWidth gap="24">
      <Column fillWidth gap="12">
        <Text variant="label-default-s">
          {t("moderation.settings.profanity.presets")}
        </Text>
        <Grid fillWidth minWidth={0} style={TOGGLES_GRID}>
          {PRESETS.map((preset) => (
            <Checkbox
              key={preset}
              checked={rule.presets.includes(preset)}
              onToggle={() => toggle(preset)}
              label={t(`moderation.settings.profanity.preset.${preset}.title`)}
              description={t(
                `moderation.settings.profanity.preset.${preset}.description`,
              )}
            />
          ))}
        </Grid>
      </Column>

      <WordListEditor
        id="profanity-allow"
        label={t("moderation.settings.profanity.allow", {
          count: rule.allow.length,
          max: AUTOMOD_LIMITS.allow,
        })}
        placeholder={t("moderation.settings.profanity.allowPlaceholder")}
        hint={t("moderation.settings.profanity.allowHint")}
        items={rule.allow}
        onChange={(allow) => onChange({ allow })}
        max={AUTOMOD_LIMITS.allow}
        maxLength={AUTOMOD_LIMITS.keywordLength}
      />
    </Column>
  );
}

function MentionSpamEditors({
  rule,
  onChange,
}: {
  rule: AutoModeration["mention_spam"];
  onChange: (patch: Partial<AutoModeration["mention_spam"]>) => void;
}) {
  const t = useT();

  return (
    <Column fillWidth gap="16">
      <Column fillWidth gap="8" className={styles.labels}>
        <NumberInput
          id="mention-spam-limit"
          label={t("moderation.settings.mention_spam.limit")}
          value={rule.limit}
          min={1}
          max={AUTOMOD_LIMITS.mentionLimit}
          onChange={(value: number) =>
            onChange({
              limit: Math.min(
                Math.max(Math.floor(Number(value)) || 1, 1),
                AUTOMOD_LIMITS.mentionLimit,
              ),
            })
          }
        />
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {t("moderation.settings.mention_spam.limitHint", {
            max: AUTOMOD_LIMITS.mentionLimit,
          })}
        </Text>
      </Column>

      <Row fillWidth gap="12" vertical="center">
        <Switch
          checked={rule.raid_protection}
          onToggle={() => onChange({ raid_protection: !rule.raid_protection })}
        />
        <Column gap="4">
          <Text variant="label-default-s">
            {t("moderation.settings.mention_spam.raidProtection")}
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {t("moderation.settings.mention_spam.raidProtectionHint")}
          </Text>
        </Column>
      </Row>
    </Column>
  );
}

// The pattern syntax stays literal in every language; only the explanation is translated.
const PATTERN_EXAMPLES = [
  ["youtube.com", "domain"],
  ["*.wikipedia.org", "subdomains"],
  ["discord.com/channels/*", "channel"],
  ["*docs*", "contains"],
] as const;

/** Discord allow-list entries the patterns expand to (each pattern costs two to four). */
function allowEntries(patterns: string[]): number {
  const words = patterns.flatMap(
    (pattern) => linkPatternToAllowWords(pattern) ?? [],
  );
  return new Set(words).size;
}

/**
 * Whitelist editor for the link filter.
 *
 * Patterns use one wildcard character (`*`) instead of regular expressions, so
 * they stay readable for server owners. Discord does the matching, with an
 * allow list the patterns are expanded into; the tester below only approximates
 * that with the dashboard's own matcher.
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
  const value = trimmed.toLowerCase();
  const duplicate = trimmed.length > 0 && patterns.includes(value);
  const kind = t("moderation.automod.kinds.links");

  const used = allowEntries(patterns);
  const patternIssue = trimmed ? describeLinkPatternIssue(t, trimmed) : null;
  const expanded = trimmed && !patternIssue ? linkPatternToAllowWords(value) : [];
  const unsupported = Boolean(trimmed) && !patternIssue && !expanded?.length;
  const addable = Boolean(trimmed) && !patternIssue && !unsupported && !duplicate;
  const needed = addable ? allowEntries([...patterns, value]) : used;
  const tooLarge = needed > AUTOMOD_LIMITS.allow;

  const draftError =
    patternIssue ??
    (unsupported
      ? t("moderation.automod.issues.link_whitelist_unsupported", {
          kind,
          pattern: trimmed,
        })
      : duplicate
        ? t("moderation.settings.whitelist.duplicate")
        : tooLarge
          ? t("moderation.automod.issues.link_whitelist_too_large", {
              kind,
              words: needed,
              max: AUTOMOD_LIMITS.allow,
            })
          : undefined);

  const probeMatch = probe.trim() ? isLinkIgnored(probe, patterns) : null;

  const addPattern = () => {
    if (!value || draftError) return;
    onChange([...patterns, value]);
    setDraft("");
  };

  return (
    <Column fillWidth gap="12">
      <Column fillWidth gap="4">
        <Text variant="label-default-s">
          {t("moderation.settings.whitelist.title", {
            count: used,
            max: AUTOMOD_LIMITS.allow,
          })}
        </Text>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {t("moderation.settings.whitelist.entriesHint", {
            max: AUTOMOD_LIMITS.allow,
          })}
        </Text>
      </Column>

      <Row fillWidth vertical="start" gap="8">
        <Column style={{ flex: 1, minWidth: 0 }}>
          <Input
            id="link-whitelist"
            label={t("moderation.settings.whitelist.pattern")}
            value={draft}
            maxLength={200}
            placeholder="youtube.com"
            errorMessage={draftError}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              addPattern();
            }}
          />
        </Column>
        <Button
          variant="secondary"
          onClick={addPattern}
          disabled={!trimmed || Boolean(draftError)}
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

      <ValueChips
        items={patterns}
        highlight={probeMatch}
        onRemove={(pattern) =>
          onChange(patterns.filter((entry) => entry !== pattern))
        }
      />

      <Input
        id="link-whitelist-test"
        label={t("moderation.settings.whitelist.test")}
        value={probe}
        maxLength={400}
        placeholder="https://www.youtube.com/watch?v=1"
        description={t("moderation.settings.whitelist.testNote")}
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
