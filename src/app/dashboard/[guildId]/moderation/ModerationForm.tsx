"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Column,
  Flex,
  IconButton,
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
            <Row key={`${rule.count}-${index}`} fillWidth gap="8" vertical="center" wrap>
              <NumberInput
                id={`threshold-count-${index}`}
                label="Warns"
                value={rule.count}
                min={1}
                max={100}
                onChange={(value: number) => updateThreshold(index, { count: Number(value) || 1 })}
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
              <IconButton
                icon="trash"
                variant="danger"
                onClick={() => removeThreshold(index)}
                tooltip="Remove rule"
              />
            </Row>
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
  const [newLink, setNewLink] = useState("");

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
        <Column fillWidth gap="8">
          <Text variant="label-default-s">Allowed domains</Text>
          <Row fillWidth gap="8" vertical="center">
            <Input
              id="link-whitelist"
              label="Domain"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const value = newLink.trim().toLowerCase();
                if (!value || linkRule.ignore_links.includes(value)) return;
                update({ ignore_links: [...linkRule.ignore_links, value] });
                setNewLink("");
              }}
            >
              Add
            </Button>
          </Row>
          <Row fillWidth gap="8" wrap>
            {linkRule.ignore_links.map((link) => (
              <Row
                key={link}
                gap="4"
                vertical="center"
                padding="4"
                radius="m"
                border="neutral-medium"
              >
                <Text variant="body-default-xs">{link}</Text>
                <IconButton
                  size="s"
                  icon="close"
                  variant="ghost"
                  onClick={() =>
                    update({ ignore_links: linkRule.ignore_links.filter((l) => l !== link) })
                  }
                />
              </Row>
            ))}
          </Row>
        </Column>
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
