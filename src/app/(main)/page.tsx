import React from "react";
import {Button, Column, Flex, Line, Row, Text} from "@once-ui-system/core";
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
        <Row fill center>
          <Row fillWidth fitHeight>
            <Hero
                tagline={config.heroTagline || CONFIG_DEFAULTS.heroTagline}
                text={config.heroText || CONFIG_DEFAULTS.heroText}
                inviteUrl={inviteUrl}
            />
          </Row>
        </Row>

        <Line vert={false}/>

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

        <Line vert={false}/>

        <Features />

        <Line vert={false}/>

        <LatestNews posts={news.posts} />
      </Column>
    </Flex>
  );
}
