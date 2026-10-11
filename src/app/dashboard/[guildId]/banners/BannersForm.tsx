"use client";

import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { Section } from "@/components/dashboard/Section";
import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useFormat, useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { BANNER_INTERVALS } from "@/lib/banners/normalize";
import { BANNER_TEMPLATES, type BannerTemplateId, createBanner } from "@/lib/banners/templates";
import type { BannerContext } from "@/lib/banners/server";
import { generateID } from "@/lib/db/generateID";
import {
  BANNER_LIMITS,
  type BannerSettings,
  type BannerStatus,
  type ServerBanner,
} from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import {
  Button,
  Column,
  DropdownWrapper,
  Feedback,
  Flex,
  Grid,
  IconButton,
  Option,
  RevealFx,
  Row,
  SegmentedControl,
  Switch,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { requestBannerRefresh, updateBannerSettings } from "./actions";
import { BannerEditor } from "./BannerEditor";

/** The part of the settings the form edits; the bot owns the rest. */
type Draft = Pick<BannerSettings, "enabled" | "interval" | "activity_window" | "active" | "items">;

const NATIVE_BUTTON = { type: "button" } as const;

export interface BannersFormProps {
  guildId: string;
  defaultSettings: BannerSettings;
  context: BannerContext;
}

function intervalLabel(minutes: number, t: ReturnType<typeof useT>): string {
  return minutes % 60 === 0
    ? t("banners.delivery.hours", { count: minutes / 60 })
    : t("banners.delivery.minutes", { count: minutes });
}

export function BannersForm({ guildId, defaultSettings, context }: BannersFormProps) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const initial: Draft = useMemo(
    () => ({
      enabled: defaultSettings.enabled,
      interval: defaultSettings.interval,
      activity_window: defaultSettings.activity_window,
      active: defaultSettings.active,
      items: defaultSettings.items,
    }),
    // The draft is only seeded from the server once; later saves update the baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  const [editingId, setEditingId] = useState<string | null>(initial.items[0]?.id ?? null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);
  useEffect(() => () => setIsDirty(false), [setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("settings", JSON.stringify(draft));

    const result: GuildActionState = await updateBannerSettings(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setBaseline(draft);
      addToast({ variant: "success", message: t("settings.shared.saveSuccess") });
      router.refresh();
    } else {
      addToast({ variant: "danger", message: result.error ?? t("settings.shared.saveFailed") });
    }
  }, [guildId, draft, router, addToast, t]);

  const handleCancel = useCallback(() => setDraft(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const update = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  // ---------- banners ----------
  const labels = {
    members: t("banners.templates.labels.members"),
    online: t("banners.templates.labels.online"),
    voice: t("banners.templates.labels.voice"),
    boosts: t("banners.templates.labels.boosts"),
    mostActive: t("banners.templates.labels.mostActive"),
    messages: t("banners.templates.labels.messages"),
    goal: t("banners.templates.labels.goal"),
  };

  const addBanner = (template: BannerTemplateId) => {
    setTemplateOpen(false);
    if (draft.items.length >= BANNER_LIMITS.items) return;
    const banner = createBanner(
      template,
      t(`banners.templates.names.${template}` as MessageKey),
      labels,
    );
    update({
      items: [...draft.items, banner],
      active: draft.active ?? banner.id,
    });
    setEditingId(banner.id);
  };

  const duplicateBanner = (banner: ServerBanner) => {
    if (draft.items.length >= BANNER_LIMITS.items) return;
    const copy: ServerBanner = {
      ...JSON.parse(JSON.stringify(banner)),
      id: generateID(),
      name: t("banners.list.copyName", { name: banner.name }).slice(0, BANNER_LIMITS.name),
    };
    // Layers need ids of their own, or the copy would share them with the original.
    copy.layers = copy.layers.map((layer) => ({ ...layer, id: generateID() }));
    const index = draft.items.findIndex((item) => item.id === banner.id);
    update({ items: [...draft.items.slice(0, index + 1), copy, ...draft.items.slice(index + 1)] });
    setEditingId(copy.id);
  };

  const removeBanner = (id: string) => {
    const items = draft.items.filter((item) => item.id !== id);
    update({ items, active: draft.active === id ? (items[0]?.id ?? null) : draft.active });
    if (editingId === id) setEditingId(items[0]?.id ?? null);
  };

  const changeBanner = (next: ServerBanner) =>
    update({ items: draft.items.map((item) => (item.id === next.id ? next : item)) });

  const editing = draft.items.find((item) => item.id === editingId) ?? null;

  // ---------- delivery ----------
  const intervalOptions = useMemo(() => {
    const values = BANNER_INTERVALS.includes(draft.interval)
      ? BANNER_INTERVALS
      : [...BANNER_INTERVALS, draft.interval].sort((a, b) => a - b);
    return values.map((minutes) => ({ label: intervalLabel(minutes, t), value: String(minutes) }));
  }, [draft.interval, t]);

  const status: BannerStatus = defaultSettings.status;
  const canRefresh = baseline.enabled && Boolean(baseline.active) && !isDirty;

  const refresh = async () => {
    setRefreshing(true);
    const result = await requestBannerRefresh(guildId);
    setRefreshing(false);
    if (result?.ok) {
      addToast({ variant: "success", message: t("banners.delivery.refreshRequested") });
      // The bot picks the request up within a minute; look again then.
      setTimeout(() => router.refresh(), 65_000);
      router.refresh();
    } else {
      addToast({ variant: "danger", message: result?.error ?? t("banners.errors.refreshFailed") });
    }
  };

  const errorText = (code: BannerStatus["error_code"]): string =>
    t(`banners.status.errors.${code ?? "unknown"}` as MessageKey);

  return (
    <SectionGrid>
      <SectionGrid.Full>
        <RevealFx translateY={-0.5} fillWidth>
          <Flex
            direction="column"
            padding="20"
            border="neutral-medium"
            radius="l"
            background="surface"
            fillWidth
          >
            <Row horizontal="between" vertical="center" gap="16">
              <Row vertical="center" gap="16" style={{ minWidth: 0 }}>
                <DashIcon name="image" />
                <Column gap="4">
                  <Text variant="body-strong-l">{t("banners.enable.title")}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {t("banners.enable.description")}
                  </Text>
                </Column>
              </Row>
              <Switch
                checked={draft.enabled}
                onToggle={() => update({ enabled: !draft.enabled })}
              />
            </Row>
          </Flex>
        </RevealFx>
      </SectionGrid.Full>

      <Section
        title={t("banners.delivery.title")}
        description={t("banners.delivery.description")}
        num={2}
        icon="send"
        span="full"
      >
        {context.canHaveBanner === false ? (
          <Feedback
            variant="warning"
            title={t("banners.status.boostTitle")}
            description={t("banners.status.boostText", { tier: context.boostTier ?? 0 })}
          />
        ) : null}
        {status.error ? (
          <Feedback
            variant="danger"
            title={errorText(status.error_code)}
            description={status.error}
          />
        ) : status.last_ok ? (
          <Feedback
            variant="success"
            description={t("banners.status.lastOk", {
              time: format.dateTime(new Date(status.last_ok), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
          />
        ) : null}

        <Row fillWidth gap="16" wrap vertical="start">
          <Column flex="1" minWidth={16} style={{ flexBasis: 220 }}>
            <LabelSelect
              id="banner-interval"
              label={t("banners.delivery.interval")}
              options={intervalOptions}
              selectedValue={String(draft.interval)}
              setSelectedValue={(value) => update({ interval: Number(value) })}
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4" paddingTop="4">
              {t("banners.delivery.intervalHint")}
            </Text>
          </Column>
          <Column flex="1" gap="4" minWidth={16} style={{ flexBasis: 220 }}>
            <Text variant="label-default-s">{t("banners.delivery.window")}</Text>
            <SegmentedControl
              fillWidth
              value={String(draft.activity_window)}
              onChange={(value) => update({ activity_window: Number(value) })}
              buttons={[
                { label: t("banners.delivery.hours", { count: 1 }), value: "60" },
                { label: t("banners.delivery.hours", { count: 2 }), value: "120" },
              ]}
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
              {t("banners.delivery.windowHint")}
            </Text>
          </Column>
        </Row>

        <Row fillWidth vertical="center" gap="12" wrap>
          <Button
            variant="secondary"
            prefixIcon="refresh"
            onClick={refresh}
            loading={refreshing}
            disabled={refreshing || !canRefresh}
          >
            {t("banners.delivery.refresh")}
          </Button>
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ flex: "1 1 220px" }}>
            {canRefresh
              ? t("banners.delivery.refreshHint")
              : t("banners.delivery.refreshNeedsSave")}
          </Text>
        </Row>
      </Section>

      <Section
        title={t("banners.list.title")}
        description={t("banners.list.description")}
        num={3}
        icon="boxes"
        span="full"
      >
        <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
          <Text variant="label-default-s">
            {t("banners.list.count", { count: draft.items.length, max: BANNER_LIMITS.items })}
          </Text>
          <DropdownWrapper
            open={templateOpen}
            onOpenChange={setTemplateOpen}
            placement="bottom-end"
            trigger={
              <Button prefixIcon="plus" disabled={draft.items.length >= BANNER_LIMITS.items}>
                {t("banners.list.add")}
              </Button>
            }
            dropdown={
              <Column gap="2" padding="4" minWidth={18}>
                <Text
                  variant="body-default-xs"
                  onBackground="neutral-weak"
                  paddingX="8"
                  paddingY="4"
                >
                  {t("banners.list.templateHint")}
                </Text>
                {BANNER_TEMPLATES.map((template) => (
                  <Option
                    key={template}
                    value={template}
                    label={t(`banners.templates.names.${template}` as MessageKey)}
                    description={t(`banners.templates.descriptions.${template}` as MessageKey)}
                    onClick={() => addBanner(template)}
                  />
                ))}
              </Column>
            }
          />
        </Row>

        {draft.items.length === 0 ? (
          <Feedback variant="info" description={t("banners.list.empty")} />
        ) : (
          <Grid
            fillWidth
            gap="12"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}
          >
            {draft.items.map((banner) => {
              const isActive = draft.active === banner.id;
              const isEditing = editingId === banner.id;
              return (
                <Column
                  key={banner.id}
                  minWidth={0}
                  gap="8"
                  padding="12"
                  radius="m"
                  border={isEditing ? "brand-strong" : "neutral-medium"}
                  background={isEditing ? "surface" : "neutral-alpha-weak"}
                >
                  <Row
                    as="button"
                    {...NATIVE_BUTTON}
                    fillWidth
                    vertical="center"
                    gap="8"
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "inherit",
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => setEditingId(banner.id)}
                  >
                    <Text variant="body-strong-s" style={{ overflowWrap: "anywhere", flex: 1 }}>
                      {banner.name}
                    </Text>
                    {isActive ? (
                      <Tag size="s" background="success-alpha-weak" onBackground="success-strong">
                        {t("banners.list.active")}
                      </Tag>
                    ) : null}
                  </Row>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {t("banners.list.layers", { count: banner.layers.length })}
                  </Text>
                  <Row fillWidth gap="4" vertical="center">
                    <Button
                      size="s"
                      variant={isActive ? "tertiary" : "secondary"}
                      disabled={isActive}
                      onClick={() => update({ active: banner.id })}
                    >
                      {isActive ? t("banners.list.inUse") : t("banners.list.use")}
                    </Button>
                    <Flex flex="1" />
                    <IconButton
                      icon="copy"
                      variant="ghost"
                      size="s"
                      tooltip={t("builder.shared.duplicate")}
                      disabled={draft.items.length >= BANNER_LIMITS.items}
                      onClick={() => duplicateBanner(banner)}
                    />
                    <ConfirmIconButton
                      variant="confirm"
                      tooltip={t("banners.list.delete")}
                      onConfirm={() => removeBanner(banner.id)}
                    />
                  </Row>
                </Column>
              );
            })}
          </Grid>
        )}
      </Section>

      {editing ? (
        <Section
          title={t("banners.editor.title", { name: editing.name })}
          description={t("banners.editor.description")}
          num={4}
          icon="palette"
          span="full"
        >
          <Feedback variant="info" description={t("banners.editor.sampleNote")} />
          <BannerEditor
            key={editing.id}
            banner={editing}
            stats={context.stats}
            onChange={changeBanner}
          />
        </Section>
      ) : null}
    </SectionGrid>
  );
}
