import React from "react";
import { Column, Row, Tag, Text } from "@once-ui-system/core";
import { getFormatters, getT } from "@/i18n/server";
import type { ServerDetail } from "@/lib/admin/servers";
import { AdminCard } from "@/components/admin/AdminPage";
import { ActivityCharts } from "./ActivityCharts";
import { ServerIcon } from "./ServerIcon";
import { Tiles } from "./Tiles";
import styles from "./Servers.module.scss";

export async function ServerDetailView({ server }: { server: ServerDetail }) {
  const t = await getT();
  const { number, date } = await getFormatters();

  const topMax = Math.max(1, ...server.topCommands.map((command) => command.count));

  const facts: { label: string; value: string }[] = [
    { label: t("adminServers.detail.id"), value: server.id },
    { label: t("adminServers.detail.owner"), value: server.ownerId ?? "—" },
    {
      label: t("adminServers.detail.joined"),
      value: server.joinedAt ? date(server.joinedAt) : "—",
    },
    ...(server.leftAt
      ? [{ label: t("adminServers.detail.left"), value: date(server.leftAt) }]
      : []),
    { label: t("adminServers.detail.language"), value: server.config?.language ?? "—" },
    { label: t("adminServers.detail.locale"), value: server.locale ?? "—" },
    { label: t("adminServers.detail.prefix"), value: server.config?.prefix ?? "—" },
    {
      label: t("adminServers.detail.boost"),
      value: t("adminServers.detail.boostTier", { tier: server.boostTier }),
    },
  ];

  return (
    <Column fillWidth gap="24">
      <Row gap="16" vertical="center" wrap>
        <ServerIcon id={server.id} icon={server.icon} name={server.name} size={128} />
        <Column gap="4" minWidth={0}>
          <Text variant="heading-strong-l">{server.name}</Text>
          <Row gap="8" vertical="center" wrap>
            <Tag scheme={server.leftAt ? "neutral" : "success"}>
              {t(server.leftAt ? "adminServers.status.left" : "adminServers.status.active")}
            </Tag>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("adminServers.detail.window")}
            </Text>
          </Row>
        </Column>
      </Row>

      <Tiles
        items={[
          { label: t("adminServers.columns.members"), value: number(server.memberCount) },
          {
            label: t("adminServers.detail.trackedUsers"),
            value: number(server.trackedUsers),
            hint: t("adminServers.detail.trackedHint"),
          },
          { label: t("adminServers.charts.commands"), value: number(server.totals.commands) },
          { label: t("adminServers.detail.components"), value: number(server.totals.components) },
          { label: t("adminServers.charts.messages"), value: number(server.totals.messages) },
          { label: t("adminServers.detail.cases"), value: number(server.moderationCases30) },
        ]}
      />

      <ActivityCharts daily={server.daily} totals={server.totals} />

      <div className={styles.chartGrid}>
        <AdminCard>
          <Text variant="heading-strong-s">{t("adminServers.detail.topCommands")}</Text>
          {server.topCommands.length === 0 ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("adminServers.detail.noCommands")}
            </Text>
          ) : (
            server.topCommands.map((command) => (
              <Column key={command.name} gap="4" fillWidth>
                <Row fillWidth horizontal="between" gap="12">
                  <Text variant="code-default-s">/{command.name}</Text>
                  <Text variant="body-default-s" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {number(command.count)}
                  </Text>
                </Row>
                <div
                  className={styles.commandBar}
                  style={{ width: `${Math.max(2, (command.count / topMax) * 100)}%` }}
                />
              </Column>
            ))
          )}
        </AdminCard>

        <AdminCard>
          <Text variant="heading-strong-s">{t("adminServers.detail.modules")}</Text>
          {server.config ? (
            <Row wrap gap="8">
              {server.config.modules.map((module) => (
                <Tag key={module.key} scheme={module.enabled ? "success" : "neutral"}>
                  {t(`adminServers.modules.${module.key}`)}
                </Tag>
              ))}
            </Row>
          ) : (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("adminServers.detail.noConfig")}
            </Text>
          )}
        </AdminCard>

        <AdminCard>
          <Text variant="heading-strong-s">{t("adminServers.detail.about")}</Text>
          <Column gap="12">
            {facts.map((fact) => (
              <Row key={fact.label} fillWidth horizontal="between" gap="16">
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {fact.label}
                </Text>
                <Text
                  variant="body-default-s"
                  style={{ overflowWrap: "anywhere", textAlign: "right" }}
                >
                  {fact.value}
                </Text>
              </Row>
            ))}
          </Column>
        </AdminCard>
      </div>
    </Column>
  );
}
