import React from "react";
import Link from "next/link";
import { Column, Row, Text } from "@once-ui-system/core";
import { getFormatters, getT } from "@/i18n/server";
import { PAGE_SIZE, type ServersOverview } from "@/lib/admin/servers";
import { AdminCard } from "@/components/admin/AdminPage";
import { Sparkline } from "./BarChart";
import { ServerIcon } from "./ServerIcon";
import styles from "./Servers.module.scss";

export async function ServerList({
  overview,
  pageHref,
}: {
  overview: ServersOverview;
  /** Link to another page of the same filtered list. */
  pageHref: (page: number) => string;
}) {
  const t = await getT();
  const { number, date } = await getFormatters();

  if (overview.rows.length === 0) {
    return (
      <AdminCard>
        <Text variant="heading-strong-s">{t("adminServers.empty.title")}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("adminServers.empty.text")}
        </Text>
      </AdminCard>
    );
  }

  return (
    <Column fillWidth gap="16">
      <Column fillWidth radius="l" border="neutral-medium" background="surface" overflow="hidden">
        <div className={styles.listHead} aria-hidden>
          <span>{t("adminServers.columns.server")}</span>
          <span>{t("adminServers.columns.members")}</span>
          <span>{t("adminServers.columns.commands")}</span>
          <span>{t("adminServers.columns.messages")}</span>
          <span>{t("adminServers.columns.trend")}</span>
          <span>{t("adminServers.columns.joined")}</span>
        </div>

        {overview.rows.map((row) => (
          <Link
            key={row.id}
            href={`/admin/servers/${row.id}`}
            className={`${styles.row} ${row.leftAt ? styles.left : ""}`}
            aria-label={t("adminServers.openServer", { name: row.name })}
          >
            <Row gap="12" vertical="center" minWidth={0}>
              <ServerIcon id={row.id} icon={row.icon} name={row.name} />
              <Column minWidth={0} gap="2">
                <span className={styles.name}>{row.name}</span>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {row.leftAt ? t("adminServers.removed", { date: date(row.leftAt) }) : row.id}
                </Text>
              </Column>
            </Row>
            <span className={`${styles.cell} ${styles.keep}`}>
              <Text variant="body-default-s">{number(row.memberCount)}</Text>
            </span>
            <span className={styles.cell}>{number(row.totals.commands)}</span>
            <span className={styles.cell}>{number(row.totals.messages)}</span>
            <span className={styles.cell}>
              <Sparkline
                values={row.trend}
                label={t("adminServers.trendLabel", { name: row.name })}
              />
            </span>
            <span className={styles.cell}>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {row.joinedAt ? date(row.joinedAt) : "—"}
              </Text>
            </span>
          </Link>
        ))}
      </Column>

      {overview.pages > 1 && (
        <Row fillWidth horizontal="between" vertical="center" gap="12">
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("adminServers.pageOf", {
              from: (overview.page - 1) * PAGE_SIZE + 1,
              to: Math.min(overview.page * PAGE_SIZE, overview.total),
              total: overview.total,
            })}
          </Text>
          <Row gap="8">
            {overview.page > 1 && (
              <Link href={pageHref(overview.page - 1)}>
                <Text variant="label-strong-s">{t("adminServers.prev")}</Text>
              </Link>
            )}
            {overview.page < overview.pages && (
              <Link href={pageHref(overview.page + 1)}>
                <Text variant="label-strong-s">{t("adminServers.next")}</Text>
              </Link>
            )}
          </Row>
        </Row>
      )}
    </Column>
  );
}
