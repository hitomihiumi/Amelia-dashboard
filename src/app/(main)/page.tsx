import React from "react";
import { Button, Column, Flex, Row, Text } from "@once-ui-system/core";
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
    <Flex fillWidth horizontal="center" paddingY="32" paddingX="16">
      <Column maxWidth="l" fillWidth gap="48">
        <Hero
          tagline={config.heroTagline || CONFIG_DEFAULTS.heroTagline}
          text={config.heroText || CONFIG_DEFAULTS.heroText}
          inviteUrl={inviteUrl}
        />

        <Column fillWidth gap="16">
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

        <Features />

        <LatestNews posts={news.posts} />

        <Flex
          direction="column"
          fillWidth
          center
          gap="16"
          padding="40"
          radius="l"
          border="neutral-medium"
          background="surface"
        >
          <Text variant="heading-strong-l" align="center">
            Ready to try it?
          </Text>
          <Text variant="body-default-m" onBackground="neutral-medium" align="center">
            Invite the bot, open the dashboard and configure everything in a couple of minutes.
          </Text>
          <Row gap="12" wrap horizontal="center">
            <Button prefixIcon="plus" variant="primary" href={inviteUrl} target="_blank">
              Invite Bot
            </Button>
            <Button prefixIcon="documentattach" variant="secondary" href="/docs/get-started">
              Read the docs
            </Button>
          </Row>
        </Flex>
      </Column>
    </Flex>
  );
}
