import React from "react";
import { Button, Column, Flex, Line, RevealFx, Row, Text } from "@once-ui-system/core";
import { CONFIG_DEFAULTS, getGlobalConfig } from "@/lib/admin/config";
import { getStatusSnapshot } from "@/lib/status/status";
import { getPublishedPosts } from "@/lib/news/news";
import { Hero } from "@/components/main/landing/Hero";
import { LandingStats } from "@/components/main/landing/LandingStats";
import { Features } from "@/components/main/landing/Features";
import { LatestNews } from "@/components/main/landing/LatestNews";
import { StatusTeaser } from "@/components/main/landing/StatusTeaser";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getT();
  const [config, snapshot, news] = await Promise.all([
    getGlobalConfig(),
    getStatusSnapshot(),
    getPublishedPosts({ take: 3 }),
  ]);

  const inviteUrl = config.inviteUrl || CONFIG_DEFAULTS.inviteUrl;

  // Texts an admin has customised are shown as written; the untouched defaults are translated.
  const customTagline =
    config.heroTagline && config.heroTagline !== CONFIG_DEFAULTS.heroTagline
      ? config.heroTagline
      : null;
  const customText =
    config.heroText && config.heroText !== CONFIG_DEFAULTS.heroText ? config.heroText : null;

  return (
    <Flex fill horizontal="center" paddingY="32" paddingX="16">
      <Column maxWidth="l" fill gap="xl">
        <RevealFx translateY={-0.5}>
          <Row fill center>
            <Row fillWidth fitHeight>
              <Hero
                tagline={customTagline ?? t("site.landing.hero.tagline")}
                text={customText ?? t("site.landing.hero.text")}
                inviteUrl={inviteUrl}
              />
            </Row>
          </Row>
        </RevealFx>

        <RevealFx delay={100} translateY={-0.5}>
          <Line vert={false} />
        </RevealFx>

        <RevealFx delay={400} translateY={-0.5}>
          <Column fill gap="16">
            <Column gap="4" horizontal="center">
              <Text variant="label-default-s" onBackground="brand-medium">
                {t("site.landing.stats.eyebrow")}
              </Text>
              <Text variant="heading-strong-l" align="center">
                {t("site.landing.stats.title")}
              </Text>
            </Column>
            <LandingStats initialSnapshot={snapshot} />
            <StatusTeaser status={snapshot.overall} />
          </Column>
        </RevealFx>

        <RevealFx delay={500} translateY={-0.5}>
          <Line vert={false} />
        </RevealFx>

        <RevealFx delay={800} translateY={-0.5}>
          <Features />
        </RevealFx>

        <RevealFx delay={900} translateY={-0.5}>
          <Line vert={false} />
        </RevealFx>

        <RevealFx delay={1200} translateY={-0.5}>
          <LatestNews posts={news.posts} />
        </RevealFx>
      </Column>
    </Flex>
  );
}
