import React from "react";
import { getFormatters, getT } from "@/i18n/server";
import type { DailyPoint, ServerTotals } from "@/lib/admin/servers";
import { AdminCard } from "@/components/admin/AdminPage";
import { BarChart } from "./BarChart";
import styles from "./Servers.module.scss";

/** The three daily charts shared by the list (all servers) and a server's page. */
export async function ActivityCharts({
  daily,
  totals,
}: { daily: DailyPoint[]; totals: ServerTotals }) {
  const t = await getT();
  const { number, date } = await getFormatters();

  const labels = daily.map((point) => date(point.day, { dateStyle: "medium", timeZone: "UTC" }));
  const edges: [string, string] = [
    date(daily[0].day, { month: "short", day: "numeric", timeZone: "UTC" }),
    date(daily[daily.length - 1].day, { month: "short", day: "numeric", timeZone: "UTC" }),
  ];
  const common = { labels, edges, formatNumber: number };

  return (
    <div className={styles.chartGrid}>
      <AdminCard>
        <BarChart
          {...common}
          title={t("adminServers.charts.commands")}
          total={number(totals.commands)}
          series={[
            {
              label: t("adminServers.charts.commands"),
              values: daily.map((p) => p.commands),
              tone: "info",
            },
          ]}
        />
      </AdminCard>
      <AdminCard>
        <BarChart
          {...common}
          title={t("adminServers.charts.messages")}
          total={number(totals.messages)}
          series={[
            {
              label: t("adminServers.charts.messages"),
              values: daily.map((p) => p.messages),
              tone: "success",
            },
          ]}
        />
      </AdminCard>
      <AdminCard>
        <BarChart
          {...common}
          title={t("adminServers.charts.members")}
          total={`+${number(totals.joins)} / −${number(totals.leaves)}`}
          series={[
            {
              label: t("adminServers.charts.joins"),
              values: daily.map((p) => p.joins),
              tone: "success",
            },
            {
              label: t("adminServers.charts.leaves"),
              values: daily.map((p) => p.leaves),
              tone: "danger",
              mirrored: true,
            },
          ]}
        />
      </AdminCard>
    </div>
  );
}
