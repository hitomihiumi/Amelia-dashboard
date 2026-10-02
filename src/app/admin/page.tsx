import React from "react";
import { Column, Flex, Grid, Row, Tag, Text } from "@once-ui-system/core";
import { prisma } from "@/lib/db/db";
import { getStatusSnapshot } from "@/lib/status/status";
import { getFormatters, getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";

export const dynamic = "force-dynamic";

function uptimeLabel(t: Translator, uptimeMs: number | null): string {
  if (!uptimeMs || uptimeMs < 0) return t("admin.overview.uptime.none");

  const minutes = Math.floor(uptimeMs / 60_000) % 60;
  const hours = Math.floor(uptimeMs / 3_600_000) % 24;
  const days = Math.floor(uptimeMs / 86_400_000);

  if (days > 0) return t("admin.overview.uptime.daysHours", { days, hours });
  if (hours > 0) return t("admin.overview.uptime.hoursMinutes", { hours, minutes });
  return t("admin.overview.uptime.minutes", { minutes });
}

export default async function AdminOverviewPage() {
  const t = await getT();
  const { number } = await getFormatters();
  const [snapshot, published, drafts, openIncidents] = await Promise.all([
    getStatusSnapshot(),
    prisma.newsPost.count({ where: { published: true } }),
    prisma.newsPost.count({ where: { published: false } }),
    prisma.incident.count({ where: { resolvedAt: null } }),
  ]);

  const overallLabel = t(`admin.serviceStatus.${snapshot.overall}`);

  const cards = [
    { label: t("admin.overview.cards.overall"), value: overallLabel },
    { label: t("admin.overview.cards.servers"), value: number(snapshot.metrics.guilds) },
    { label: t("admin.overview.cards.members"), value: number(snapshot.metrics.members) },
    { label: t("admin.overview.cards.uptime"), value: uptimeLabel(t, snapshot.metrics.uptimeMs) },
    { label: t("admin.overview.cards.published"), value: number(published) },
    { label: t("admin.overview.cards.drafts"), value: number(drafts) },
    { label: t("admin.overview.cards.openIncidents"), value: number(openIncidents) },
    {
      label: t("admin.overview.cards.shards"),
      value: `${snapshot.metrics.shards.ready}/${snapshot.metrics.shards.total || 1}`,
    },
  ];

  return (
    <Column fillWidth gap="16">
      <Row fillWidth horizontal="between" vertical="center">
        <Text variant="heading-strong-m">{t("admin.overview.title")}</Text>
        <Tag scheme={snapshot.overall === "operational" ? "success" : "warning"}>
          {overallLabel}
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
