"use client";

import { BannerImagesProvider } from "@/components/banners/BannerImages";
import { usedUploads } from "@/lib/banners/images";
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
import type { BannerSettings, BannerStatus, ServerBanner } from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import {
  Button,
  Column,
  DropdownWrapper,
  Feedback,
  Flex,
  Grid,
  Option,
  RevealFx,
  Row,
  SegmentedControl,
  Switch,
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
      // The one banner is always the one on the server.
      active: defaultSettings.items[0]?.id ?? null,
      items: defaultSettings.items,
    }),
    // The draft is only seeded from the server once; later saves update the baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
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

  /** A server keeps one banner: a template replaces whatever is there. */
  const applyTemplate = (template: BannerTemplateId) => {
    setTemplateOpen(false);
    const banner = createBanner(
      template,
      t(`banners.templates.names.${template}` as MessageKey),
      labels,
    );
    update({ items: [banner], active: banner.id });
  };

  /** Without a banner there is nothing to keep up to date, so the module goes off with it. */
  const removeBanner = () => update({ items: [], active: null, enabled: false });

  const changeBanner = (next: ServerBanner) => update({ items: [next], active: next.id });

  const banner = draft.items[0] ?? null;

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
    <BannerImagesProvider guildId={guildId} usedIds={usedUploads(draft.items)}>
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
              <Text
                variant="body-default-xs"
                onBackground="neutral-weak"
                paddingX="4"
                paddingTop="4"
              >
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
            <Text
              variant="body-default-xs"
              onBackground="neutral-weak"
              style={{ flex: "1 1 220px" }}
            >
              {canRefresh
                ? t("banners.delivery.refreshHint")
                : t("banners.delivery.refreshNeedsSave")}
            </Text>
          </Row>
        </Section>

        <Section
          title={t("banners.editor.title")}
          description={
            banner ? t("banners.editor.description") : t("banners.editor.chooseTemplate")
          }
          num={3}
          icon="palette"
          span="full"
        >
          {banner === null ? (
            <Grid
              fillWidth
              gap="12"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}
            >
              {BANNER_TEMPLATES.map((template) => (
                <Column
                  key={template}
                  as="button"
                  {...NATIVE_BUTTON}
                  gap="4"
                  padding="16"
                  radius="m"
                  border="neutral-medium"
                  background="neutral-alpha-weak"
                  onClick={() => applyTemplate(template)}
                  style={{
                    color: "inherit",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <Text variant="body-strong-s">
                    {t(`banners.templates.names.${template}` as MessageKey)}
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {t(`banners.templates.descriptions.${template}` as MessageKey)}
                  </Text>
                </Column>
              ))}
            </Grid>
          ) : (
            <>
              <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
                <Feedback
                  variant="info"
                  description={t("banners.editor.sampleNote")}
                  style={{ flex: "1 1 320px" }}
                />
                <Row gap="8" vertical="center">
                  <DropdownWrapper
                    open={templateOpen}
                    onOpenChange={setTemplateOpen}
                    placement="bottom-end"
                    trigger={
                      <Button variant="secondary" prefixIcon="redo">
                        {t("banners.editor.replace")}
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
                          {t("banners.editor.replaceHint")}
                        </Text>
                        {BANNER_TEMPLATES.map((template) => (
                          <Option
                            key={template}
                            value={template}
                            label={t(`banners.templates.names.${template}` as MessageKey)}
                            description={t(
                              `banners.templates.descriptions.${template}` as MessageKey,
                            )}
                            onClick={() => applyTemplate(template)}
                          />
                        ))}
                      </Column>
                    }
                  />
                  <ConfirmIconButton
                    variant="confirm"
                    tooltip={t("banners.editor.remove")}
                    onConfirm={removeBanner}
                  />
                </Row>
              </Row>
              <BannerEditor
                key={banner.id}
                guildId={guildId}
                banner={banner}
                stats={context.stats}
                onChange={changeBanner}
              />
            </>
          )}
        </Section>
      </SectionGrid>
    </BannerImagesProvider>
  );
}
