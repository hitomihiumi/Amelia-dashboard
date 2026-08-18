"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Column,
  Feedback,
  Flex,
  Input,
  Line,
  Row,
  Switch,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import type { AuditCategory, AuditEventKey, AuditSettings } from "@/lib/db/types";
import { AUDIT_CATEGORIES, AUDIT_EVENT_CATEGORY, AUDIT_EVENT_KEYS } from "@/lib/db/types";
import { updateAuditSettings } from "../actions";

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  members: "Members",
  messages: "Messages",
  voice: "Voice",
  server: "Server",
};

const EVENT_LABELS: Record<AuditEventKey, string> = {
  member_join: "Member joined",
  member_leave: "Member left",
  member_roles: "Roles changed",
  member_nickname: "Nickname changed",
  member_ban: "Member banned",
  member_unban: "Member unbanned",
  member_kick: "Member kicked",
  member_timeout: "Member timed out",
  message_delete: "Message deleted",
  message_edit: "Message edited",
  message_bulk_delete: "Messages purged",
  voice_join: "Joined a voice channel",
  voice_leave: "Left a voice channel",
  voice_move: "Switched voice channels",
  channel_create: "Channel created",
  channel_delete: "Channel deleted",
  channel_update: "Channel renamed",
  role_create: "Role created",
  role_delete: "Role deleted",
  role_update: "Role updated",
  guild_update: "Server updated",
};

export function AuditForm({
  guildId,
  defaultSettings,
  textChannels,
  roles,
}: {
  guildId: string;
  defaultSettings: AuditSettings;
  textChannels: ChannelPickOption[];
  roles: DiscordRole[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [audit, setAudit] = useState(defaultSettings);
  const [baseline, setBaseline] = useState(defaultSettings);

  const isDirty = useMemo(
    () => JSON.stringify(audit) !== JSON.stringify(baseline),
    [audit, baseline],
  );

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

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: <RolePill roleColor={role.color} label={role.name} />,
        value: role.id,
      })),
    [roles],
  );

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("audit", JSON.stringify(audit));

    const result: GuildActionState = await updateAuditSettings(guildId, fd);

    if (result?.ok) {
      setBaseline(audit);
      addToast({ message: "Audit log saved", variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result?.error || "Save failed", variant: "danger" });
    }
  }, [guildId, audit, router, addToast]);

  const handleCancel = useCallback(() => setAudit(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const update = (patch: Partial<AuditSettings>) => setAudit((prev) => ({ ...prev, ...patch }));

  const eventConfig = (event: AuditEventKey) =>
    audit.events[event] ?? { enabled: true, channel: null };

  const updateEvent = (
    event: AuditEventKey,
    patch: Partial<{ enabled: boolean; channel: string | null }>,
  ) =>
    setAudit((prev) => ({
      ...prev,
      events: { ...prev.events, [event]: { ...eventConfig(event), ...patch } },
    }));

  return (
    <Column fillWidth gap="24">
      <Section
        title="General"
        description="The bot posts through a webhook it creates in the channel you pick."
      >
        <Row fillWidth gap="12" vertical="center">
          <Switch isChecked={audit.enabled} onToggle={() => update({ enabled: !audit.enabled })} />
          <Text variant="label-default-s">Audit log is on</Text>
        </Row>

        <ChannelSelect
          fillWidth
          id="audit-channel"
          label="Audit log channel"
          options={channelOptions}
          selectedChannel={audit.channel ?? ""}
          setSelectedChannel={(value) => update({ channel: (value as string) || null })}
        />

        <ChannelSelect
          fillWidth
          multiple
          id="audit-ignore-channels"
          label="Ignored channels"
          options={channelOptions}
          selectedChannel={audit.ignore_channels}
          setSelectedChannel={(value) => update({ ignore_channels: value as string[] })}
        />

        <RoleSelect
          fillWidth
          multiple
          id="audit-ignore-roles"
          label="Ignored roles"
          options={roleOptions}
          selectedRole={audit.ignore_roles}
          setSelectedRole={(value) => update({ ignore_roles: value as string[] })}
        />

        <Row fillWidth gap="12" vertical="center">
          <Switch
            isChecked={audit.ignore_bots}
            onToggle={() => update({ ignore_bots: !audit.ignore_bots })}
          />
          <Text variant="label-default-s">Skip actions made by bots</Text>
        </Row>

        <Line />

        <Input
          id="audit-webhook-name"
          label="Webhook name"
          value={audit.webhook.name ?? ""}
          maxLength={80}
          onChange={(e) => update({ webhook: { ...audit.webhook, name: e.target.value || null } })}
        />
        <Input
          id="audit-webhook-avatar"
          label="Webhook avatar URL"
          value={audit.webhook.avatar ?? ""}
          maxLength={400}
          onChange={(e) =>
            update({ webhook: { ...audit.webhook, avatar: e.target.value || null } })
          }
        />

        <Feedback
          variant="info"
          title="Bot permissions"
          description="The bot needs “Manage Webhooks” in the log channel, and “View Audit Log” on the server to name the moderator behind bans, kicks and role changes."
        />
      </Section>

      {AUDIT_CATEGORIES.map((category) => (
        <Section
          key={category}
          title={CATEGORY_LABELS[category]}
          description="Turn single events off, or send them to their own channel."
        >
          {AUDIT_EVENT_KEYS.filter((event) => AUDIT_EVENT_CATEGORY[event] === category).map(
            (event) => (
              <Accordion key={event} title={EVENT_LABELS[event]}>
                <Column fillWidth gap="12">
                  <Row fillWidth gap="12" vertical="center">
                    <Switch
                      isChecked={eventConfig(event).enabled}
                      onToggle={() => updateEvent(event, { enabled: !eventConfig(event).enabled })}
                    />
                    <Text variant="label-default-s">Log this event</Text>
                  </Row>

                  <ChannelSelect
                    fillWidth
                    id={`audit-channel-${event}`}
                    label="Send to a different channel (optional)"
                    options={channelOptions}
                    selectedChannel={eventConfig(event).channel ?? ""}
                    setSelectedChannel={(value) =>
                      updateEvent(event, { channel: (value as string) || null })
                    }
                  />
                </Column>
              </Accordion>
            ),
          )}
        </Section>
      ))}
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
