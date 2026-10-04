"use client";

import React from "react";
import { Banner, Icon, Row, Text } from "@once-ui-system/core";
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
    <div>
      <div className={styles.frame} aria-hidden>
        {/* Not live: still draw the strip, faded, so the colours can be judged. */}
        <div className={live ? undefined : styles.faded}>
          <Banner solid={banner.solid as never} onSolid={banner.onSolid as never}>
            <Icon name={variant === "success" ? "check" : "warning"} size="s" />
            <span className={styles.wrapText}>{trimmed || t("admin.config.banner.sample")}</span>
          </Banner>
        </div>

        <div className={styles.fakeHeader}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--brand-alpha-medium)",
              border: "1px solid var(--brand-alpha-strong)",
            }}
          />
          <Text variant="label-strong-s">Amelia</Text>
          <Row gap="8" style={{ marginLeft: "auto" }}>
            <span className={styles.fakeLine} style={{ width: 36 }} />
            <span className={styles.fakeLine} style={{ width: 28 }} />
            <span className={styles.fakeLine} style={{ width: 44 }} />
          </Row>
        </div>

        <div className={styles.fakeBody}>
          <span className={styles.fakeLine} style={{ width: "55%" }} />
          <span className={styles.fakeLine} style={{ width: "38%" }} />
        </div>
      </div>

      {note && (
        <Row gap="8" vertical="center" paddingTop="8">
          <Icon name="info" size="xs" onBackground="neutral-weak" />
          <Text variant="body-default-s" onBackground="neutral-weak" role="status">
            {note}
          </Text>
        </Row>
      )}
    </div>
  );
}
