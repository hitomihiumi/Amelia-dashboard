"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import classNames from "classnames";
import { Chip, Column, Grid, Row, StatusIndicator, Tag, Text, ToggleButton } from "@once-ui-system/core";
import {
  IoAppsOutline,
  IoCheckmark,
  IoCheckmarkCircleOutline,
  IoConstructOutline,
  IoEyeOutline,
  IoFlagOutline,
  IoFlameOutline,
  IoGlobeOutline,
  IoGridOutline,
  IoInformationCircleOutline,
  IoPulseOutline,
  IoSearchOutline,
  IoServerOutline,
  IoSparklesOutline,
  IoWarningOutline,
} from "react-icons/io5";
import { TONE_COLOR } from "@/components/admin/overview/primitives";
import { useT } from "@/i18n/client";
import type { Formatters } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";
import {
  type IncidentComponent,
  type IncidentSeverity,
  type IncidentStatus,
  isIncidentComponent,
  isIncidentStatus,
  isSeverity,
  SEVERITY_TONE,
  STATUS_TONE,
  type ToneScheme,
  statusTone,
} from "@/components/status/incidentMeta";
import tones from "@/components/status/tones.module.scss";
import styles from "./incidentUi.module.scss";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
export const SEVERITY_ICON: Record<IncidentSeverity, ReactNode> = {
  minor: <IoInformationCircleOutline />,
  major: <IoWarningOutline />,
  critical: <IoFlameOutline />,
  maintenance: <IoConstructOutline />,
};

export const STATUS_ICON: Record<IncidentStatus, ReactNode> = {
  investigating: <IoSearchOutline />,
  identified: <IoFlagOutline />,
  monitoring: <IoEyeOutline />,
  resolved: <IoCheckmarkCircleOutline />,
};

export const COMPONENT_ICON: Record<IncidentComponent | "none", ReactNode> = {
  gateway: <IoPulseOutline />,
  database: <IoServerOutline />,
  website: <IoGlobeOutline />,
  shards: <IoGridOutline />,
  none: <IoAppsOutline />,
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
/** Admin-side labels for the stored enum values; unknown values are shown as stored. */
export function useIncidentLabels() {
  const t = useT();

  return {
    severity: (value: string) => (isSeverity(value) ? t(`admin.severity.${value}`) : value),
    status: (value: string) =>
      isIncidentStatus(value) ? t(`admin.incidents.status.${value}`) : value,
    component: (value: string) =>
      isIncidentComponent(value) ? t(`admin.components.${value}`) : value,
  };
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------
/**
 * Current time that is the same on the server and during hydration (it starts from
 * the value the server rendered with) and then ticks, so "5 minutes ago" stays honest.
 */
export function useNow(initial: number, intervalMs = 30_000): number {
  const [now, setNow] = useState(initial);

  // Also re-runs when the server hands over a newer time after a refresh.
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [initial, intervalMs]);

  return now;
}

/**
 * "5 minutes ago". Never "in 3 seconds": the server's clock and the browser's differ
 * a little, so anything that appears to lie in the future is treated as happening now.
 */
export function relativeAgo(format: Formatters, value: Date | string, now: number): string {
  return format.relative(Math.min(new Date(value).getTime(), now), now);
}

/** "12 min", "3 h 5 min", "2 d 4 h". */
export function formatDuration(t: Translator, ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  if (totalMinutes < 1) return t("adminIncidents.duration.lessThanMinute");

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) return t("adminIncidents.duration.daysHours", { days, hours });
  if (hours > 0) return t("adminIncidents.duration.hoursMinutes", { hours, minutes });
  return t("adminIncidents.duration.minutes", { minutes });
}

// ---------------------------------------------------------------------------
// Selectable options
// ---------------------------------------------------------------------------
export interface RadioOption<V extends string> {
  value: V;
  label: string;
  description?: string;
  icon: ReactNode;
  tone: ToneScheme;
}

interface RadioCardsProps<V extends string> {
  /** Accessible name of the whole group. */
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: RadioOption<V>[];
  variant: "card" | "tile" | "chip";
  disabled?: boolean;
}

const OPTION_CLASS = {
  card: styles.optionCard,
  tile: styles.optionTile,
  chip: styles.optionChip,
} as const;

const OPTION_RADIUS = { card: "l", tile: "m", chip: "full" } as const;

/** A radio group drawn as cards, tiles or pills, with roving focus and arrow-key navigation. */
export function RadioCards<V extends string>({
  label,
  value,
  onChange,
  options,
  variant,
  disabled,
}: RadioCardsProps<V>) {
  const refs = useRef<(HTMLElement | null)[]>([]);

  const move = (from: number, step: number) => {
    const next = (from + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, -1);
        break;
      case "Home":
        event.preventDefault();
        move(0, 0);
        break;
      case "End":
        event.preventDefault();
        move(options.length - 1, 0);
        break;
    }
  };

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const items = options.map((option, index) => (
    <ToggleButton
      key={option.value}
      ref={(node) => {
        refs.current[index] = node;
      }}
      type="button"
      role="radio"
      variant="outline"
      size="l"
      radius={OPTION_RADIUS[variant]}
      horizontal="start"
      fillWidth={variant !== "chip"}
      aria-checked={option.value === value}
      tabIndex={index === selectedIndex ? 0 : -1}
      disabled={disabled}
      onClick={() => onChange(option.value)}
      onKeyDown={(event: React.KeyboardEvent) => onKeyDown(event, index)}
      className={classNames(styles.option, OPTION_CLASS[variant], tones[option.tone])}
    >
      <Row fillWidth vertical={variant === "card" ? "start" : "center"} gap={variant === "card" ? "12" : "8"}>
        <Row center aria-hidden className={styles.optionIcon}>
          {option.icon}
        </Row>
        <Column flex={1} gap="2" align="start" style={{ minWidth: 0 }}>
          <Text variant="body-strong-s" className={styles.optionLabel}>
            {option.label}
          </Text>
          {option.description && (
            <Text variant="body-default-xs" onBackground="neutral-weak" align="left">
              {option.description}
            </Text>
          )}
        </Column>
        {variant === "card" && (
          <Row center aria-hidden className={styles.optionCheck}>
            <IoCheckmark />
          </Row>
        )}
      </Row>
    </ToggleButton>
  ));

  if (variant === "chip") {
    return (
      <Row role="radiogroup" aria-label={label} fillWidth wrap gap="8">
        {items}
      </Row>
    );
  }

  return (
    <Grid
      role="radiogroup"
      aria-label={label}
      fillWidth
      gap="8"
      columns={variant === "card" ? "2" : undefined}
      xs={variant === "card" ? { columns: "1" } : undefined}
      style={variant === "tile" ? { gridTemplateColumns: "repeat(auto-fill, minmax(9.75rem, 1fr))" } : undefined}
    >
      {items}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Pickers built on RadioCards
// ---------------------------------------------------------------------------
const SEVERITY_ORDER: IncidentSeverity[] = ["minor", "major", "critical", "maintenance"];
const STATUS_ORDER: IncidentStatus[] = ["investigating", "identified", "monitoring", "resolved"];
const COMPONENT_ORDER: IncidentComponent[] = ["gateway", "database", "website", "shards"];

export function SeverityPicker({
  value,
  onChange,
  compact,
}: {
  value: IncidentSeverity;
  onChange: (value: IncidentSeverity) => void;
  compact?: boolean;
}) {
  const t = useT();

  return (
    <RadioCards
      label={t("adminIncidents.form.severity")}
      variant={compact ? "tile" : "card"}
      value={value}
      onChange={onChange}
      options={SEVERITY_ORDER.map((severity) => ({
        value: severity,
        label: t(`adminIncidents.severity.${severity}.label`),
        description: compact ? undefined : t(`adminIncidents.severity.${severity}.description`),
        icon: SEVERITY_ICON[severity],
        tone: SEVERITY_TONE[severity],
      }))}
    />
  );
}

export function ComponentPicker({
  value,
  onChange,
  disabled,
}: {
  /** "" means "general / none". */
  value: IncidentComponent | "";
  onChange: (value: IncidentComponent | "") => void;
  disabled?: boolean;
}) {
  const t = useT();

  return (
    <RadioCards<IncidentComponent | "none">
      label={t("adminIncidents.form.component")}
      variant="tile"
      disabled={disabled}
      value={value === "" ? "none" : value}
      onChange={(next) => onChange(next === "none" ? "" : next)}
      options={[
        ...COMPONENT_ORDER.map((component) => ({
          value: component,
          label: t(`admin.components.${component}`),
          icon: COMPONENT_ICON[component],
          tone: "brand" as const,
        })),
        {
          value: "none" as const,
          label: t("adminIncidents.form.componentNone"),
          icon: COMPONENT_ICON.none,
          tone: "brand" as const,
        },
      ]}
    />
  );
}

export function StatusPicker({
  value,
  onChange,
  label,
}: {
  value: IncidentStatus;
  onChange: (value: IncidentStatus) => void;
  label: string;
}) {
  const t = useT();

  return (
    <RadioCards
      label={label}
      variant="chip"
      value={value}
      onChange={onChange}
      options={STATUS_ORDER.map((status) => ({
        value: status,
        label: t(`admin.incidents.status.${status}`),
        icon: STATUS_ICON[status],
        tone: STATUS_TONE[status],
      }))}
    />
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
export function StatusChip({
  status,
  ongoing,
}: {
  status: string;
  /** Pulse the dot while the incident is still open. */
  ongoing?: boolean;
}) {
  const labels = useIncidentLabels();
  const tone = statusTone(status);

  return (
    <Tag scheme={tone === "brand" ? "brand" : tone} size="m" radius="full">
      <Row vertical="center" gap="8" paddingRight="4">
        <StatusIndicator
          aria-hidden
          ariaLabel=""
          size="m"
          color={tone === "brand" ? "magenta" : TONE_COLOR[tone]}
          className={classNames(ongoing && styles.pulse, tones[tone])}
        />
        <Text variant="label-strong-s">{labels.status(status)}</Text>
      </Row>
    </Tag>
  );
}

export function AutoBadge() {
  const t = useT();

  return (
    <Tag scheme="brand" size="s" title={t("adminIncidents.meta.autoHint")}>
      <Row vertical="center" gap="4">
        <IoSparklesOutline aria-hidden />
        <Text variant="label-strong-xs" style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {t("adminIncidents.meta.auto")}
        </Text>
      </Row>
    </Tag>
  );
}

export function CharCounter({ count, max }: { count: number; max: number }) {
  const t = useT();

  return (
    <Text
      variant="body-default-xs"
      onBackground={count > max ? "danger-strong" : count >= max * 0.9 ? "warning-strong" : "neutral-weak"}
      style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
    >
      {t("adminIncidents.counter", { count, max })}
    </Text>
  );
}

/** Inserts a template into whatever is already written, or replaces it when it would not fit. */
export function applyTemplate(current: string, template: string, max: number): string {
  const text = current.trim();
  if (!text) return template;
  if (text.includes(template)) return current;

  const joined = `${text}\n\n${template}`;
  return joined.length <= max ? joined : template;
}

export function TemplateChips({
  label,
  templates,
  onPick,
}: {
  label: string;
  templates: { key: string; label: string; text: string }[];
  onPick: (key: string) => void;
}) {
  return (
    <Row fillWidth wrap vertical="center" gap="8" role="group" aria-label={label}>
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {label}
      </Text>
      {templates.map((template) => (
        <Chip
          key={template.key}
          selected={false}
          prefixIcon="sparkle"
          label={template.label}
          title={template.text}
          onClick={() => onPick(template.key)}
        />
      ))}
    </Row>
  );
}
