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

export const dynamic = "force-dynamic";

export default async function Home() {
  const [config, snapshot, news] = await Promise.all([
    getGlobalConfig(),
    getStatusSnapshot(),
    getPublishedPosts({ take: 3 }),
  ]);

  const inviteUrl = config.inviteUrl || CONFIG_DEFAULTS.inviteUrl;

  return (
    <Flex fill horizontal="center" paddingY="32" paddingX="16">
      <Column maxWidth="l" fill gap="xl">
        <RevealFx translateY={-0.5}>
          <Row fill center>
            <Row fillWidth fitHeight>
              <Hero
                tagline={config.heroTagline || CONFIG_DEFAULTS.heroTagline}
                text={config.heroText || CONFIG_DEFAULTS.heroText}
                inviteUrl={inviteUrl}
              />
            </Row>
          </Row>
        </RevealFx>

        <RevealFx delay={0.1} translateY={-0.5}>
          <Line vert={false} />
        </RevealFx>

        <RevealFx delay={0.4} translateY={-0.5}>
          <Column fill gap="16">
            <Column gap="4" horizontal="center">
              <Text variant="label-default-s" onBackground="brand-medium">
                ALREADY RUNNING
              </Text>
              <Text variant="heading-strong-l" align="center">
                Amelia is live on Discord servers
              </Text>
            </Column>
            <LandingStats initialSnapshot={snapshot} />
            <StatusTeaser status={snapshot.overall} />
          </Column>
        </RevealFx>

        <RevealFx delay={0.5} translateY={-0.5}>
          <Line vert={false} />
        </RevealFx>

        <RevealFx delay={0.8} translateY={-0.5}>
          <Features />
        </RevealFx>

        <RevealFx delay={0.9} translateY={-0.5}>
          <Line vert={false} />
        </RevealFx>

        <RevealFx delay={1.2} translateY={-0.5}>
          <LatestNews posts={news.posts} />
        </RevealFx>
      </Column>
    </Flex>
  );
}
