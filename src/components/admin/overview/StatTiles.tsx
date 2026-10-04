import React from "react";
import { Column, Grid, RevealFx, Row, Text } from "@once-ui-system/core";
import type { StatusMetrics } from "@/lib/status/status";
import type { IconName } from "@/resources/icons";
import { getFormatters, getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";
import { IconTile } from "./primitives";
import styles from "./Overview.module.scss";

function uptimeLabel(t: Translator, uptimeMs: number | null): string {
  if (!uptimeMs || uptimeMs < 0) return t("admin.overview.uptime.none");

  const minutes = Math.floor(uptimeMs / 60_000) % 60;
  const hours = Math.floor(uptimeMs / 3_600_000) % 24;
  const days = Math.floor(uptimeMs / 86_400_000);

  if (days > 0) return t("admin.overview.uptime.daysHours", { days, hours });
  if (hours > 0) return t("admin.overview.uptime.hoursMinutes", { hours, minutes });
  return t("admin.overview.uptime.minutes", { minutes });
}

interface Tile {
  key: string;
  icon: IconName;
  label: string;
  value: string;
  /** Colours the value when something is off; omitted when all is well. */
  tone?: "warning" | "danger";
}

/** The row of headline numbers at the top of the overview. */
export async function StatTiles({ metrics }: { metrics: StatusMetrics }) {
  const t = await getT();
  const { number } = await getFormatters();

  const { shards } = metrics;
  const shardTone = shards.total === 0 || shards.ready === 0 ? "danger" : shards.ready < shards.total ? "warning" : undefined;

  const tiles: Tile[] = [
    {
      key: "servers",
      icon: "organization",
      label: t("admin.overview.cards.servers"),
      value: number(metrics.guilds),
    },
    {
      key: "members",
      icon: "person",
      label: t("admin.overview.cards.members"),
      value: number(metrics.members),
    },
    {
      key: "commands",
      icon: "command",
      label: t("admin.overview.cards.commands"),
      value: number(metrics.commands),
    },
    {
      key: "ping",
      icon: "bolt",
      label: t("admin.overview.cards.ping"),
      value:
        metrics.ping === null
          ? t("admin.overview.uptime.none")
          : t("admin.overview.units.ms", { value: number(metrics.ping) }),
    },
    {
      key: "uptime",
      icon: "time",
      label: t("admin.overview.cards.uptime"),
      value: uptimeLabel(t, metrics.uptimeMs),
    },
    {
      key: "shards",
      icon: "boxes",
      label: t("admin.overview.cards.shards"),
      value: `${number(shards.ready)}/${number(shards.total)}`,
      tone: shardTone,
    },
  ];

  return (
    <Grid className={styles.tiles}>
      {tiles.map((tile, index) => (
        <RevealFx key={tile.key} fillWidth delay={index * 60} speed="fast" translateY="8">
          <Column
            fillWidth
            gap="16"
            padding="16"
            radius="l"
            border="neutral-medium"
            background="surface"
          >
            <Row fillWidth vertical="center" gap="12">
              <IconTile name={tile.icon} size={32} tone={tile.tone} />
              <Text variant="label-default-s" onBackground="neutral-weak" truncate>
                {tile.label}
              </Text>
            </Row>
            <Text
              variant="heading-strong-xl"
              onBackground={tile.tone ? `${tile.tone}-strong` : "neutral-strong"}
            >
              {tile.value}
            </Text>
          </Column>
        </RevealFx>
      ))}
    </Grid>
  );
}
