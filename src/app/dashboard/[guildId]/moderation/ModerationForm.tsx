"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Button,
  Column,
  Feedback,
  Flex,
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
import { isLinkIgnored, validateLinkPattern } from "@/lib/moderation/linkPatterns";
import { updateModerationSettings } from "./actions";

type AutoModeration = GuildSchema["moderation"]["auto_moderation"];

export interface ModerationSettingsState {
  moderation_roles: string[];
  log_channel: string | null;
  dm_notify: boolean;
  warn_expiry: number;
  warn_thresholds: WarnThreshold[];
}

const PUNISHMENT_OPTIONS = [
  { label: "Warn", value: PunishmentType.Warn },
  { label: "Mute", value: PunishmentType.Mute },
  { label: "Kick", value: PunishmentType.Kick },
  { label: "Ban", value: PunishmentType.Ban },
];

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

    const result: GuildActionState = await updateModerationSettings(guildId, fd);

    if (result?.ok) {
      setBaseline({ settings, autoMod });
      addToast({ message: "Moderation settings saved", variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result?.error || "Save failed", variant: "danger" });
    }
  }, [guildId, settings, autoMod, router, addToast]);

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
        { count, punishment: { type: PunishmentType.Mute, time: 3600, reason: "" } },
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
      <Section title="General" description="Who may moderate and where actions are recorded.">
        <RoleSelect
          fillWidth
          multiple
          id="moderation-roles"
          label="Moderator roles"
          options={roleOptions}
          selectedRole={settings.moderation_roles}
          setSelectedRole={(value) =>
            setSettings((prev) => ({ ...prev, moderation_roles: value as string[] }))
          }
          description="Members with these roles can use the /mod commands. Administrators always can."
        />

        <ChannelSelect
          fillWidth
          id="moderation-log"
          label="Moderation log channel"
          options={channelOptions}
          selectedChannel={settings.log_channel ?? ""}
          setSelectedChannel={(value) =>
            setSettings((prev) => ({ ...prev, log_channel: (value as string) || null }))
          }
        />

        <Row fillWidth gap="12" vertical="center">
          <Switch
            isChecked={settings.dm_notify}
            onToggle={() => setSettings((prev) => ({ ...prev, dm_notify: !prev.dm_notify }))}
          />
          <Column gap="4">
            <Text variant="label-default-s">Notify punished members</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              Send a direct message with the reason, the duration and the appeal link.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section
        title="Warn escalation"
        description="Punish members automatically once they collect a given number of active warns."
      >
        <NumberInput
          id="warn-expiry"
          label="Warns expire after (days, 0 = never)"
          value={settings.warn_expiry}
          min={0}
          max={365}
          onChange={(value: number) =>
            setSettings((prev) => ({ ...prev, warn_expiry: Number(value) || 0 }))
          }
        />

        <Column fillWidth gap="12">
          {settings.warn_thresholds.map((rule, index) => (
            <Accordion title={`Rule ${index + 1}`} key={`${rule.count}-${index}`}>
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
                    tooltip="Remove rule"
                  />
                </Row>
                <NumberInput
                  id={`threshold-count-${index}`}
                  label="Warns"
                  value={rule.count}
                  min={1}
                  max={100}
                  onChange={(value: number) =>
                    updateThreshold(index, { count: Number(value) || 1 })
                  }
                />
                <SegmentedControl
                  fillWidth
                  buttons={PUNISHMENT_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  selected={rule.punishment.type}
                  onToggle={(value) =>
                    updateThreshold(index, {
                      punishment: { ...rule.punishment, type: value as PunishmentType },
                    })
                  }
                />
                <NumberInput
                  id={`threshold-time-${index}`}
                  label="Duration (seconds)"
                  value={rule.punishment.time}
                  min={0}
                  max={2419200}
                  onChange={(value: number) =>
                    updateThreshold(index, {
                      punishment: { ...rule.punishment, time: Number(value) || 0 },
                    })
                  }
                />
              </Row>
            </Accordion>
          ))}

          {settings.warn_thresholds.length === 0 && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              No escalation configured — warns only accumulate.
            </Text>
          )}

          <Row fillWidth horizontal="start">
            <Button
              prefixIcon="plus"
              variant="secondary"
              onClick={addThreshold}
              disabled={settings.warn_thresholds.length >= 10}
            >
              Add rule
            </Button>
          </Row>
        </Column>
      </Section>

      <AutoModerationSection
        title="Invite filter"
        description="Act on messages containing invites to other Discord servers."
        rule={autoMod.invite}
        onChange={(next) => setAutoMod((prev) => ({ ...prev, invite: next }))}
        roleOptions={roleOptions}
        channelOptions={channelOptions}
      />

      <AutoModerationSection
        title="Link filter"
        description="Act on messages containing links. Whitelisted domains are ignored."
        rule={autoMod.links}
        onChange={(next) => setAutoMod((prev) => ({ ...prev, links: next }))}
        roleOptions={roleOptions}
        channelOptions={channelOptions}
        whitelist
      />
    </Column>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Flex
      direction="column"
      fillWidth
      gap="16"
      padding="24"
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      <Column gap="4">
        <Text variant="heading-strong-s">{title}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {description}
        </Text>
      </Column>
      <Line />
      {children}
    </Flex>
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
  whitelist = false,
}: {
  title: string;
  description: string;
  rule: AutoModeration["invite"] | AutoModeration["links"];
  onChange: (next: any) => void;
  roleOptions: { label: React.ReactNode; value: string }[];
  channelOptions: { label: React.ReactNode; value: string }[];
  whitelist?: boolean;
}) {
  const linkRule = rule as AutoModRule;

  const update = (patch: Record<string, unknown>) => onChange({ ...rule, ...patch });

  return (
    <Section title={title} description={description}>
      <Row fillWidth gap="12" vertical="center">
        <Switch isChecked={rule.enabled} onToggle={() => update({ enabled: !rule.enabled })} />
        <Text variant="label-default-s">Enabled</Text>
      </Row>

      <Row fillWidth gap="12" vertical="center">
        <Switch
          isChecked={rule.delete_message}
          onToggle={() => update({ delete_message: !rule.delete_message })}
        />
        <Text variant="label-default-s">Delete the offending message</Text>
      </Row>

      <Row fillWidth gap="12" vertical="center">
        <Switch
          isChecked={rule.moderation_immune}
          onToggle={() => update({ moderation_immune: !rule.moderation_immune })}
        />
        <Text variant="label-default-s">Moderators are exempt</Text>
      </Row>

      <ChannelSelect
        fillWidth
        multiple
        id={`${title}-ignore-channels`}
        label="Ignored channels"
        options={channelOptions}
        selectedChannel={rule.ignore_channels}
        setSelectedChannel={(value) => update({ ignore_channels: value as string[] })}
      />

      <RoleSelect
        fillWidth
        multiple
        id={`${title}-ignore-roles`}
        label="Ignored roles"
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
        <Text variant="label-default-s">Punishment</Text>
        <SegmentedControl
          fillWidth
          buttons={PUNISHMENT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          selected={rule.punishment.type}
          onToggle={(value) =>
            update({ punishment: { ...rule.punishment, type: value as PunishmentType } })
          }
        />
        <NumberInput
          id={`${title}-punishment-time`}
          label="Duration in seconds (0 = permanent)"
          value={rule.punishment.time}
          min={0}
          max={2419200}
          onChange={(value: number) =>
            update({ punishment: { ...rule.punishment, time: Number(value) || 0 } })
          }
        />
        <Input
          id={`${title}-punishment-reason`}
          label="Reason"
          value={rule.punishment.reason}
          maxLength={400}
          onChange={(e) => update({ punishment: { ...rule.punishment, reason: e.target.value } })}
        />
      </Column>
    </Section>
  );
}

const PATTERN_EXAMPLES: [string, string][] = [
  ["youtube.com", "the domain itself, every subdomain and every page"],
  ["*.wikipedia.org", "subdomains only"],
  ["discord.com/channels/*", "only links pointing at a channel"],
  ["*docs*", "any link containing “docs”"],
];

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
  const [draft, setDraft] = useState("");
  const [probe, setProbe] = useState("");

  const trimmed = draft.trim();
  const draftError = trimmed ? validateLinkPattern(trimmed) : null;
  const duplicate = trimmed.length > 0 && patterns.includes(trimmed.toLowerCase());

  const probeMatch = probe.trim() ? isLinkIgnored(probe, patterns) : null;

  const addPattern = () => {
    const value = trimmed.toLowerCase();
    if (!value || draftError || duplicate) return;
    onChange([...patterns, value]);
    setDraft("");
  };

  return (
    <Column fillWidth gap="12">
      <Text variant="label-default-s">Allowed links ({patterns.length}/100)</Text>

      <Row fillWidth gap="8" vertical="center">
        <Input
          id="link-whitelist"
          label="Pattern"
          value={draft}
          maxLength={200}
          placeholder="youtube.com"
          errorMessage={
            draftError ?? (duplicate ? "This pattern is already in the list." : undefined)
          }
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          variant="secondary"
          onClick={addPattern}
          disabled={!trimmed || Boolean(draftError) || duplicate || patterns.length >= 100}
        >
          Add
        </Button>
      </Row>

      <Accordion title="How patterns work">
        <Column fillWidth gap="8">
          <Text variant="body-default-s" onBackground="neutral-medium">
            Write the address as you would read it. The star stands for “anything”; everything else
            is matched literally. A pattern always covers the deeper pages of what it matched.
          </Text>
          {PATTERN_EXAMPLES.map(([pattern, meaning]) => (
            <Row key={pattern} fillWidth gap="8" vertical="center" wrap>
              <InlineCode>{pattern}</InlineCode>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {meaning}
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
            border={probeMatch === pattern ? "success-medium" : "neutral-medium"}
          >
            <Text variant="body-default-xs">{pattern}</Text>
            <IconButton
              size="s"
              icon="close"
              variant="ghost"
              onClick={() => onChange(patterns.filter((entry) => entry !== pattern))}
            />
          </Row>
        ))}
      </Row>

      <Input
        id="link-whitelist-test"
        label="Test a link against the list"
        value={probe}
        maxLength={400}
        placeholder="https://www.youtube.com/watch?v=1"
        onChange={(e) => setProbe(e.target.value)}
      />

      {probe.trim() &&
        (probeMatch ? (
          <Feedback
            variant="success"
            title="This link is allowed"
            description={`Matched by the pattern “${probeMatch}”.`}
          />
        ) : (
          <Feedback
            variant="warning"
            title="This link is moderated"
            description="No pattern matches it, so the filter would act on this link."
          />
        ))}
    </Column>
  );
}
