"use client";

import React from "react";
import { Column, Flex, Icon, IconButton, Row, Switch, Text } from "@once-ui-system/core";
import {
  BANNER_VARIANTS,
  CONFIG_DEFAULTS,
  CONFIG_LIMITS,
  SERVICE_KEYS,
  SERVICE_STATUSES,
  STATUS_TONE,
  type BannerVariant,
  type ServiceOverride,
  type Tone,
} from "@/lib/admin/defaults";
import { useT } from "@/i18n/client";
import { Eyebrow } from "@/components/admin/Eyebrow";
import { StatusDot } from "@/components/admin/overview/primitives";
import { BannerPreview } from "./BannerPreview";
import { ChipPicker, TextField, type ChipOption } from "./fields";
import { ConfigSection } from "./ConfigSection";
import { HeroPreview, useHeroWords } from "./HeroPreview";
import {
  isDefaultCopy,
  linkHost,
  linkState,
  type FormState,
  type LinkField,
} from "./form";

interface SectionProps {
  state: FormState;
  update: (patch: Partial<FormState>) => void;
}

const BANNER_TONE: Record<BannerVariant, Tone> = {
  info: "info",
  warning: "warning",
  danger: "danger",
  success: "success",
};

function PreviewLabel({ children }: { children: string }) {
  return (
    <Row gap="8" vertical="center">
      <Icon name="eye" size="xs" onBackground="neutral-weak" />
      <Eyebrow as="p">{children}</Eyebrow>
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Announcement banner
// ---------------------------------------------------------------------------

export function BannerSection({ state, update }: SectionProps) {
  const t = useT();

  const variants: ChipOption[] = BANNER_VARIANTS.map((variant) => ({
    value: variant,
    label: t(`admin.config.banner.variant.${variant}`),
    tone: BANNER_TONE[variant],
  }));

  return (
    <ConfigSection
      id="banner"
      icon="megaphone"
      title={t("admin.config.banner.title")}
      description={t("admin.config.banner.description")}
      aside={
        <Row gap="12" vertical="center">
          <Text variant="label-default-s" as="span" id="banner-switch-label">
            {t("admin.config.banner.show")}
          </Text>
          <Switch
            ariaLabel={t("admin.config.banner.show")}
            checked={state.bannerEnabled}
            onToggle={() => update({ bannerEnabled: !state.bannerEnabled })}
          />
        </Row>
      }
    >
      <TextField
        id="banner-text"
        label={t("admin.config.banner.text")}
        placeholder={t("admin.config.banner.placeholder")}
        lines={2}
        max={CONFIG_LIMITS.bannerText}
        value={state.bannerText}
        onChange={(bannerText) => update({ bannerText })}
      />

      <Column fillWidth gap="8">
        <Text variant="label-default-s" onBackground="neutral-weak">
          {t("admin.config.banner.style")}
        </Text>
        <ChipPicker
          label={t("admin.config.banner.style")}
          value={state.bannerVariant}
          options={variants}
          onChange={(bannerVariant) => update({ bannerVariant })}
        />
      </Column>

      <Column fillWidth gap="8">
        <PreviewLabel>{t("admin.config.preview")}</PreviewLabel>
        <BannerPreview
          enabled={state.bannerEnabled}
          text={state.bannerText}
          variant={state.bannerVariant}
        />
      </Column>
    </ConfigSection>
  );
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

function LinkInput({
  field,
  state,
  update,
  label,
  hint,
  placeholder,
  fallback,
}: SectionProps & {
  field: LinkField;
  label: string;
  hint: string;
  placeholder: string;
  /** The built-in link used when the field is empty, if there is one. */
  fallback?: string;
}) {
  const t = useT();
  const value = state[field];
  const status = linkState(value);

  const message =
    status === "valid" ? (
      <Row gap="4" vertical="center" onBackground="success-strong">
        <Icon name="check" size="xs" />
        {t("admin.config.links.valid", { host: linkHost(value) })}
      </Row>
    ) : (
      hint
    );

  return (
    <TextField
      id={`link-${field}`}
      label={label}
      value={value}
      max={CONFIG_LIMITS.url}
      placeholder={placeholder}
      onChange={(next) => update({ [field]: next })}
      error={status === "invalid" ? t("admin.config.links.invalid") : undefined}
      hint={message}
      onReset={fallback ? () => update({ [field]: fallback }) : undefined}
      resetDisabled={!value.trim() || value.trim() === fallback}
      suffix={
        <Row gap="4" vertical="center">
          {status === "valid" && <Icon name="check" size="s" onBackground="success-strong" />}
          {status === "invalid" && <Icon name="danger" size="s" onBackground="danger-strong" />}
          <IconButton
            icon="arrowUpRight"
            variant="tertiary"
            size="s"
            href={status === "valid" ? value.trim() : undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={status !== "valid"}
            tooltip={t("admin.config.links.open")}
            aria-label={t("admin.config.links.open")}
          />
        </Row>
      }
    />
  );
}

export function LinksSection({ state, update }: SectionProps) {
  const t = useT();

  return (
    <ConfigSection
      id="links"
      icon="link"
      title={t("admin.config.links.title")}
      description={t("admin.config.links.description")}
    >
      <LinkInput
        field="inviteUrl"
        state={state}
        update={update}
        label={t("admin.config.links.invite")}
        hint={t("admin.config.links.inviteHint")}
        placeholder={CONFIG_DEFAULTS.inviteUrl}
        fallback={CONFIG_DEFAULTS.inviteUrl}
      />
      <LinkInput
        field="supportUrl"
        state={state}
        update={update}
        label={t("admin.config.links.support")}
        hint={t("admin.config.links.supportHint")}
        placeholder="https://discord.gg/…"
      />
      <LinkInput
        field="githubUrl"
        state={state}
        update={update}
        label={t("admin.config.links.github")}
        hint={t("admin.config.links.githubHint")}
        placeholder={CONFIG_DEFAULTS.githubUrl}
        fallback={CONFIG_DEFAULTS.githubUrl}
      />
    </ConfigSection>
  );
}

// ---------------------------------------------------------------------------
// Landing page copy
// ---------------------------------------------------------------------------

export function LandingSection({ state, update }: SectionProps) {
  const t = useT();
  const words = useHeroWords(state.heroTagline);

  const taglineDefault = isDefaultCopy(state.heroTagline, "heroTagline");
  const textDefault = isDefaultCopy(state.heroText, "heroText");

  return (
    <ConfigSection
      id="landing"
      icon="home"
      title={t("admin.config.landing.title")}
      description={t("admin.config.landing.description")}
    >
      <TextField
        id="hero-tagline"
        label={t("admin.config.landing.tagline")}
        placeholder={t("site.landing.hero.tagline")}
        max={CONFIG_LIMITS.heroTagline}
        value={state.heroTagline}
        onChange={(heroTagline) => update({ heroTagline })}
        hint={
          taglineDefault
            ? t("admin.config.landing.usingDefault")
            : t("admin.config.landing.taglineHint")
        }
        onReset={() => update({ heroTagline: CONFIG_DEFAULTS.heroTagline })}
        resetDisabled={taglineDefault}
      />

      <TextField
        id="hero-text"
        label={t("admin.config.landing.heroText")}
        placeholder={t("site.landing.hero.text")}
        lines={3}
        max={CONFIG_LIMITS.heroText}
        value={state.heroText}
        onChange={(heroText) => update({ heroText })}
        hint={textDefault ? t("admin.config.landing.usingDefault") : undefined}
        onReset={() => update({ heroText: CONFIG_DEFAULTS.heroText })}
        resetDisabled={textDefault}
      />

      <Column fillWidth gap="8">
        <PreviewLabel>{t("admin.config.preview")}</PreviewLabel>
        <HeroPreview tagline={state.heroTagline} text={state.heroText} />
        {words.length > 1 && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("admin.config.landing.cycles", { words: words.join(" → ") })}
          </Text>
        )}
      </Column>
    </ConfigSection>
  );
}

// ---------------------------------------------------------------------------
// Status & maintenance
// ---------------------------------------------------------------------------

export function StatusSection({ state, update }: SectionProps) {
  const t = useT();

  const options: ChipOption[] = [
    { value: "", label: t("admin.config.status.auto"), tone: "neutral" },
    ...SERVICE_STATUSES.map((status) => ({
      value: status,
      label: t(`admin.serviceStatus.${status}`),
      tone: STATUS_TONE[status],
    })),
  ];

  const setOverride = (key: string, patch: ServiceOverride) => {
    const merged = { ...state.serviceOverrides[key], ...patch };
    const next = { ...state.serviceOverrides };

    // An empty status means "trust the measurement": drop the entry entirely.
    if (!merged.status) delete next[key];
    else next[key] = merged;

    update({ serviceOverrides: next });
  };

  return (
    <ConfigSection
      id="status"
      icon="radialGauge"
      title={t("admin.config.status.title")}
      description={t("admin.config.status.description")}
    >
      <Row
        fillWidth
        vertical="center"
        gap="16"
        paddingX="16"
        paddingY="12"
        radius="l"
        background={state.maintenance ? "warning-alpha-weak" : "neutral-alpha-weak"}
        border={state.maintenance ? "warning-alpha-strong" : "neutral-alpha-medium"}
      >
        <Column flex={1} gap="2">
          <Text variant="body-strong-s" as="span">
            {t("admin.config.status.maintenance")}
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {t("admin.config.status.maintenanceHint")}
          </Text>
        </Column>
        <Switch
          ariaLabel={t("admin.config.status.maintenance")}
          checked={state.maintenance}
          onToggle={() => update({ maintenance: !state.maintenance })}
        />
      </Row>

      {state.maintenance && (
        <Row
          fillWidth
          vertical="start"
          gap="12"
          padding="16"
          radius="l"
          background="warning-alpha-weak"
          border="warning-alpha-strong"
          role="status"
        >
          <Icon name="warning" size="m" onBackground="warning-strong" />
          <Column flex={1} gap="2">
            <Text variant="body-strong-s">{t("admin.config.status.maintenanceWarningTitle")}</Text>
            <Text variant="body-default-s" onBackground="neutral-medium">
              {t("admin.config.status.maintenanceWarning")}
            </Text>
          </Column>
        </Row>
      )}

      <TextField
        id="maintenance-message"
        label={t("admin.config.status.maintenanceMessage")}
        max={CONFIG_LIMITS.maintenanceMessage}
        value={state.maintenanceMessage}
        onChange={(maintenanceMessage) => update({ maintenanceMessage })}
      />

      <Column fillWidth gap="4">
        <Text variant="body-strong-m" as="h3">
          {t("admin.config.status.services")}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("admin.config.status.servicesHint")}
        </Text>
      </Column>

      <Column fillWidth gap="12">
        {SERVICE_KEYS.map((key) => {
          const override = state.serviceOverrides[key];
          const status = override?.status ?? "";
          const service = t(`admin.components.${key}`);
          const tone: Tone = state.maintenance
            ? "info"
            : status
              ? (STATUS_TONE[status as keyof typeof STATUS_TONE] ?? "neutral")
              : "neutral";

          return (
            <Column
              key={key}
              fillWidth
              gap="12"
              padding="16"
              radius="l"
              background="neutral-alpha-weak"
              border="neutral-alpha-medium"
            >
              <Row fillWidth vertical="center" gap="12" wrap>
                <Row flex={1} gap="12" vertical="center">
                  {tone === "neutral" ? (
                    <Flex
                      aria-hidden
                      width={0.5}
                      height={0.5}
                      radius="full"
                      border="neutral-strong"
                    />
                  ) : (
                    <StatusDot tone={tone} />
                  )}
                  <Text variant="body-strong-s">{service}</Text>
                  {state.maintenance && (
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {t("admin.config.status.overridden")}
                    </Text>
                  )}
                </Row>
              </Row>

              <Column fillWidth style={{ opacity: state.maintenance ? 0.55 : 1 }}>
                <ChipPicker
                  label={t("admin.config.status.statusOf", { service })}
                  value={status}
                  options={options}
                  onChange={(value) => setOverride(key, { status: value })}
                />
              </Column>

              {status && (
                <TextField
                  id={`override-note-${key}`}
                  size="s"
                  label={t("admin.config.status.note")}
                  placeholder={t("admin.config.status.notePlaceholder")}
                  max={CONFIG_LIMITS.serviceNote}
                  value={override?.note ?? ""}
                  onChange={(note) => setOverride(key, { note })}
                />
              )}
            </Column>
          );
        })}
      </Column>
    </ConfigSection>
  );
}
