import React from "react";
import { Text } from "@once-ui-system/core";
import { AdminCard, AdminPage } from "@/components/admin/AdminPage";
import { ActivityCharts } from "@/components/admin/servers/ActivityCharts";
import { ServerList } from "@/components/admin/servers/ServerList";
import { ServersFilters } from "@/components/admin/servers/ServersFilters";
import { Tiles } from "@/components/admin/servers/Tiles";
import { getServersOverview, type ServerSort, type ServerStatus } from "@/lib/admin/servers";
import { getFormatters, getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type Param = string | string[] | undefined;
const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

const SORTS: ServerSort[] = ["members", "commands", "messages", "joined", "name"];
const STATUSES: ServerStatus[] = ["active", "left", "all"];

export default async function AdminServersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: Param; status?: Param; sort?: Param; page?: Param }>;
}) {
  const t = await getT();
  const { number } = await getFormatters();
  const params = await searchParams;

  const status = STATUSES.find((value) => value === first(params.status)) ?? "active";
  const sort = SORTS.find((value) => value === first(params.sort)) ?? "members";
  const search = first(params.q)?.slice(0, 100) ?? "";
  const page = Math.max(1, Number(first(params.page)) || 1);

  const overview = await getServersOverview({ search, status, sort, page }).catch((error) => {
    console.error("[Admin Servers]:", error);
    return null;
  });

  if (!overview) {
    return (
      <AdminPage title={t("adminServers.title")} description={t("adminServers.description")}>
        <AdminCard>
          <Text variant="body-default-s">{t("adminServers.unavailable")}</Text>
        </AdminCard>
      </AdminPage>
    );
  }

  const { summary } = overview;

  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (status !== "active") next.set("status", status);
    if (sort !== "members") next.set("sort", sort);
    if (target > 1) next.set("page", String(target));
    const text = next.toString();
    return text ? `/admin/servers?${text}` : "/admin/servers";
  };

  return (
    <AdminPage title={t("adminServers.title")} description={t("adminServers.description")}>
      <Tiles
        items={[
          { label: t("adminServers.summary.servers"), value: number(summary.active) },
          { label: t("adminServers.summary.members"), value: number(summary.members) },
          {
            label: t("adminServers.summary.added"),
            value: `+${number(summary.joined30)}`,
            hint: t("adminServers.summary.last30"),
          },
          {
            label: t("adminServers.summary.removed"),
            value: `−${number(summary.left30)}`,
            hint: t("adminServers.summary.last30"),
          },
          {
            label: t("adminServers.charts.commands"),
            value: number(summary.totals.commands),
            hint: t("adminServers.summary.last30"),
          },
          {
            label: t("adminServers.charts.messages"),
            value: number(summary.totals.messages),
            hint: t("adminServers.summary.last30"),
          },
        ]}
      />

      <ActivityCharts daily={overview.daily} totals={summary.totals} />

      <ServersFilters search={search} status={status} sort={sort} />
      <ServerList overview={overview} pageHref={pageHref} />
    </AdminPage>
  );
}
