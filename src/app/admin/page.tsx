import React from "react";
import { Column, Flex, Grid, Row, Tag, Text } from "@once-ui-system/core";
import { prisma } from "@/lib/db/db";
import { formatUptime, getStatusSnapshot } from "@/lib/status/status";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [snapshot, published, drafts, openIncidents] = await Promise.all([
    getStatusSnapshot(),
    prisma.newsPost.count({ where: { published: true } }),
    prisma.newsPost.count({ where: { published: false } }),
    prisma.incident.count({ where: { resolvedAt: null } }),
  ]);

  const cards = [
    { label: "Overall status", value: snapshot.overall },
    { label: "Servers", value: snapshot.metrics.guilds.toLocaleString("en-US") },
    { label: "Members", value: snapshot.metrics.members.toLocaleString("en-US") },
    { label: "Uptime", value: formatUptime(snapshot.metrics.uptimeMs) },
    { label: "Published posts", value: String(published) },
    { label: "Drafts", value: String(drafts) },
    { label: "Open incidents", value: String(openIncidents) },
    {
      label: "Shards",
      value: `${snapshot.metrics.shards.ready}/${snapshot.metrics.shards.total || 1}`,
    },
  ];

  return (
    <Column fillWidth gap="16">
      <Row fillWidth horizontal="between" vertical="center">
        <Text variant="heading-strong-m">Overview</Text>
        <Tag variant={snapshot.overall === "operational" ? "success" : "warning"}>
          {snapshot.overall}
        </Tag>
      </Row>

      <Grid columns={4} m={{ columns: 2 }} s={{ columns: 1 }} gap="16" fillWidth>
        {cards.map((card) => (
          <Flex
            key={card.label}
            direction="column"
            fillWidth
            gap="8"
            padding="20"
            radius="l"
            border="neutral-medium"
            background="surface"
          >
            <Text variant="label-default-s" onBackground="neutral-weak">
              {card.label}
            </Text>
            <Text variant="heading-strong-l">{card.value}</Text>
          </Flex>
        ))}
      </Grid>
    </Column>
  );
}
