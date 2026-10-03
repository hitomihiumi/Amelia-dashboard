"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import type {
  AuditCategory,
  AuditEventKey,
  AuditSettings,
} from "@/lib/db/types";
import {
  AUDIT_CATEGORIES,
  AUDIT_EVENT_CATEGORY,
  AUDIT_EVENT_KEYS,
} from "@/lib/db/types";
import { updateAuditSettings } from "../actions";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { useT } from "@/i18n/client";
import styles from "./AuditForm.module.scss";

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
  const t = useT();
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
      addToast({ message: t("moderation.audit.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({
        message: result?.error || t("moderation.errors.saveFailed"),
        variant: "danger",
      });
    }
  }, [guildId, audit, router, addToast, t]);

  const handleCancel = useCallback(() => setAudit(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const update = (patch: Partial<AuditSettings>) =>
    setAudit((prev) => ({ ...prev, ...patch }));

  const eventConfig = (event: AuditEventKey) =>
    audit.events[event] ?? { enabled: true, channel: null };

  const updateCategory = (category: AuditCategory, channel: string | null) =>
    setAudit((prev) => ({
      ...prev,
      categories: { ...prev.categories, [category]: { channel } },
    }));

  const updateEvent = (
    event: AuditEventKey,
    patch: Partial<{ enabled: boolean; channel: string | null }>,
  ) =>
    setAudit((prev) => ({
      ...prev,
      events: { ...prev.events, [event]: { ...eventConfig(event), ...patch } },
    }));

  const renderCategory = (category: AuditCategory) => {
    const idx = AUDIT_CATEGORIES.indexOf(category);
    return (
      <Section
        key={category}
        title={t(`moderation.audit.categories.${category}`)}
        description={t("moderation.audit.category.description")}
        num={idx + 2}
      >
        <ChannelSelect
          fillWidth
          id={`audit-category-${category}`}
          label={t("moderation.audit.category.channel", {
            category: t(`moderation.audit.categories.${category}`),
          })}
          options={channelOptions}
          selectedChannel={audit.categories?.[category]?.channel ?? ""}
          setSelectedChannel={(value) =>
            updateCategory(category, (value as string) || null)
          }
          description={t("moderation.audit.category.channelHint")}
        />

        {AUDIT_EVENT_KEYS.filter(
          (event) => AUDIT_EVENT_CATEGORY[event] === category,
        ).map((event) => (
          <Accordion
            key={event}
            title={
              <Row fillWidth gap="12" horizontal="between" marginRight={"12"}>
                {t(`moderation.audit.events.${event}`)}
                <Switch
                  checked={eventConfig(event).enabled}
                  onToggle={() =>
                    updateEvent(event, {
                      enabled: !eventConfig(event).enabled,
                    })
                  }
                />
              </Row>
            }
          >
            <Column fillWidth gap="12">
              <ChannelSelect
                fillWidth
                id={`audit-channel-${event}`}
                label={t("moderation.audit.event.channel")}
                options={channelOptions}
                selectedChannel={eventConfig(event).channel ?? ""}
                setSelectedChannel={(value) =>
                  updateEvent(event, { channel: (value as string) || null })
                }
              />
            </Column>
          </Accordion>
        ))}
      </Section>
    );
  };

  // Balanced stacks of categories for the number of columns the page has room for.
  const catsRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const el = catsRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setColumns(w >= 1300 ? 3 : w >= 840 ? 2 : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stacks: AuditCategory[][] = useMemo(() => {
    const all = AUDIT_CATEGORIES;
    if (columns === 3) return [all.slice(0, 1), all.slice(1, 3), all.slice(3)];
    if (columns === 2) return [all.slice(0, 2), all.slice(2)];
    return [all];
  }, [columns]);

  return (
    <SectionGrid>
      <Section
        title={t("moderation.audit.general.title")}
        description={t("moderation.audit.general.description")}
        span="full"
        num={1}
        icon="clipboard"
        switcher={
          <Switch
            checked={audit.enabled}
            onToggle={() => update({ enabled: !audit.enabled })}
          />
        }
      >
        <div className={styles.two}>
          <div className={styles.col}>
            <ChannelSelect
              fillWidth
              id="audit-channel"
              label={t("moderation.audit.general.channel")}
              description={t("moderation.audit.general.channelHint")}
              options={channelOptions}
              selectedChannel={audit.channel ?? ""}
              setSelectedChannel={(value) =>
                update({ channel: (value as string) || null })
              }
            />

            <ChannelSelect
              fillWidth
              multiple
              id="audit-ignore-channels"
              label={t("moderation.audit.general.ignoredChannels")}
              options={channelOptions}
              selectedChannel={audit.ignore_channels}
              setSelectedChannel={(value) =>
                update({ ignore_channels: value as string[] })
              }
            />

            <RoleSelect
              fillWidth
              multiple
              id="audit-ignore-roles"
              label={t("moderation.audit.general.ignoredRoles")}
              options={roleOptions}
              selectedRole={audit.ignore_roles}
              setSelectedRole={(value) =>
                update({ ignore_roles: value as string[] })
              }
            />

            <Row fillWidth gap="12" vertical="center">
              <Switch
                checked={audit.ignore_bots}
                onToggle={() => update({ ignore_bots: !audit.ignore_bots })}
              />
              <Text variant="label-default-s">
                {t("moderation.audit.general.skipBots")}
              </Text>
            </Row>
          </div>
          <div className={styles.col}>
            <Input
              id="audit-webhook-name"
              label={t("moderation.audit.general.webhookName")}
              value={audit.webhook.name ?? ""}
              maxLength={80}
              onChange={(e) =>
                update({
                  webhook: { ...audit.webhook, name: e.target.value || null },
                })
              }
            />
            <Input
              id="audit-webhook-avatar"
              label={t("moderation.audit.general.webhookAvatar")}
              value={audit.webhook.avatar ?? ""}
              maxLength={400}
              onChange={(e) =>
                update({
                  webhook: { ...audit.webhook, avatar: e.target.value || null },
                })
              }
            />

            <Feedback
              variant="info"
              title={t("moderation.audit.general.permissionsTitle")}
              description={t("moderation.audit.general.permissionsText")}
            />
          </div>
        </div>
      </Section>

      <SectionGrid.Full>
        <div
          ref={catsRef}
          className={styles.cats}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {stacks.map((group, i) => (
            <div key={i} className={styles.stack}>
              {group.map(renderCategory)}
            </div>
          ))}
        </div>
      </SectionGrid.Full>
    </SectionGrid>
  );
}
