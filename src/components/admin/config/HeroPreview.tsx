"use client";

import React from "react";
import { Button, Column, Flex, Media, Row, Text } from "@once-ui-system/core";
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
    <Row
      fillWidth
      center
      gap="24"
      paddingX="24"
      paddingY="32"
      overflow="hidden"
      border="neutral-alpha-medium"
      radius="l"
      background="page"
      pointerEvents="none"
      aria-hidden
    >
      <Flex position="absolute" top="0" left="0" fill pointerEvents="none" className={styles.heroGlow} />
      <Column center gap="8" maxWidth={28} style={{ minWidth: 0, textAlign: "center" }}>
        <Text variant="heading-strong-xs" onBackground="brand-medium" className={styles.wrapText}>
          {words[0] ?? CONFIG_DEFAULTS.heroTagline}
        </Text>
        <Text variant="display-strong-l" onBackground="brand-weak">
          Amelia
        </Text>
        <Text align="center" onBackground="neutral-medium" className={styles.wrapText}>
          {shownText}
        </Text>
        <Row wrap center gap="12" paddingTop="8">
          <Button prefixIcon="discord" variant="primary" tabIndex={-1}>
            {t("common.nav.login")}
          </Button>
          <Button prefixIcon="plus" variant="secondary" tabIndex={-1}>
            {t("site.landing.hero.inviteBot")}
          </Button>
        </Row>
      </Column>
      <Row
        width={7}
        height={7}
        radius="full"
        border="brand-alpha-strong"
        borderWidth={2}
        padding="2"
        overflow="hidden"
        s={{ hide: true }}
      >
        <Media fill src="/images/avatar.jpg" radius="full" alt="" />
      </Row>
    </Row>
  );
}
