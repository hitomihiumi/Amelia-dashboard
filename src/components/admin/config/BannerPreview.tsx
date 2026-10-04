"use client";

import React from "react";
import { Banner, Column, Icon, Row, Text } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import styles from "./Config.module.scss";

// Same table as the public layout in src/app/(main)/layout.tsx; keep the two in sync.
const BANNER_SOLID: Record<string, { solid: string; onSolid: string }> = {
  info: { solid: "info-medium", onSolid: "info-strong" },
  warning: { solid: "warning-medium", onSolid: "warning-strong" },
  danger: { solid: "danger-medium", onSolid: "danger-strong" },
  success: { solid: "success-medium", onSolid: "success-strong" },
};

/**
 * The banner exactly as the public layout draws it, on top of a sketch of the site header.
 * The layout only shows it when it is enabled and has text, and so does this.
 */
export function BannerPreview({
  enabled,
  text,
  variant,
}: {
  enabled: boolean;
  text: string;
  variant: string;
}) {
  const t = useT();
  const banner = BANNER_SOLID[variant] ?? BANNER_SOLID.warning;
  const trimmed = text.trim();
  const live = enabled && trimmed.length > 0;

  const note = !enabled
    ? t("admin.config.banner.hidden")
    : trimmed
      ? null
      : t("admin.config.banner.empty");

  return (
    <Column fillWidth>
      <Column
        fillWidth
        overflow="hidden"
        border="neutral-alpha-medium"
        radius="l"
        background="page"
        pointerEvents="none"
        aria-hidden
      >
        {/* Not live: still draw the strip, faded, so the colours can be judged. */}
        <Column fillWidth className={live ? undefined : styles.faded}>
          <Banner solid={banner.solid as never} onSolid={banner.onSolid as never}>
            <Icon name={variant === "success" ? "check" : "warning"} size="s" />
            <Text className={styles.wrapText}>{trimmed || t("admin.config.banner.sample")}</Text>
          </Banner>
        </Column>

        <Row fillWidth vertical="center" gap="12" paddingX="16" paddingY="12">
          <Row
            width={1.5}
            height={1.5}
            radius="full"
            background="brand-alpha-medium"
            border="brand-alpha-strong"
          />
          <Text variant="label-strong-s">Amelia</Text>
          <Row fitWidth gap="8" style={{ marginLeft: "auto" }}>
            <FakeLine width={2.25} />
            <FakeLine width={1.75} />
            <FakeLine width={2.75} />
          </Row>
        </Row>

        <Column fillWidth gap="8" paddingX="16" paddingTop="4" paddingBottom="16">
          <FakeLine width="55%" />
          <FakeLine width="38%" />
        </Column>
      </Column>

      {note && (
        <Row gap="8" vertical="center" paddingTop="8">
          <Icon name="info" size="xs" onBackground="neutral-weak" />
          <Text variant="body-default-s" onBackground="neutral-weak" role="status">
            {note}
          </Text>
        </Row>
      )}
    </Column>
  );
}

/** A grey bar standing in for text in the sketch of the site. */
function FakeLine({ width }: { width: number | `${number}%` }) {
  return <Row width={width} height={0.5} radius="full" background="neutral-alpha-medium" />;
}
