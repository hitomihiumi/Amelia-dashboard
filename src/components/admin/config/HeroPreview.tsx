"use client";

import React from "react";
import { Button, Media, Text } from "@once-ui-system/core";
import { CONFIG_DEFAULTS } from "@/lib/admin/defaults";
import { useT } from "@/i18n/client";
import { isDefaultCopy } from "./form";
import styles from "./Config.module.scss";

/** The words the real hero cycles through; mirrors src/components/main/landing/Hero.tsx. */
export function useHeroWords(tagline: string): string[] {
  const t = useT();
  const custom = !isDefaultCopy(tagline, "heroTagline");
  const base = custom ? tagline.trim() : t("site.landing.hero.tagline");

  return base.includes(",")
    ? base
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean)
    : [base, t("site.landing.hero.wordMultipurpose"), t("site.landing.hero.wordCustomizable")];
}

/**
 * A static copy of the landing hero. The built-in copy is shown translated, exactly as
 * the home page does, and a custom text is shown as typed.
 */
export function HeroPreview({ tagline, text }: { tagline: string; text: string }) {
  const t = useT();
  const words = useHeroWords(tagline);

  const shownText = isDefaultCopy(text, "heroText") ? t("site.landing.hero.text") : text.trim();

  return (
    <div className={styles.heroFrame} aria-hidden>
      <div className={styles.heroGlow} />
      <div className={styles.heroContent}>
        <Text variant="heading-strong-xs" onBackground="brand-medium" className={styles.wrapText}>
          {words[0] ?? CONFIG_DEFAULTS.heroTagline}
        </Text>
        <Text variant="display-strong-l" onBackground="brand-weak">
          Amelia
        </Text>
        <Text align="center" onBackground="neutral-medium" className={styles.wrapText}>
          {shownText}
        </Text>
        <div style={{ display: "flex", gap: 12, paddingTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Button prefixIcon="discord" variant="primary" tabIndex={-1}>
            {t("common.nav.login")}
          </Button>
          <Button prefixIcon="plus" variant="secondary" tabIndex={-1}>
            {t("site.landing.hero.inviteBot")}
          </Button>
        </div>
      </div>
      <div className={styles.heroAvatar}>
        <Media fill src="/images/avatar.jpg" radius="full" alt="" />
      </div>
    </div>
  );
}
