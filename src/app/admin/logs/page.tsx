import React from "react";
import { AdminPage } from "@/components/admin/AdminPage";
import { LogsView } from "@/components/admin/logs/LogsView";
import { getLogs, LOG_WINDOW_HOURS, type LogLevel } from "@/lib/admin/logs";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

type Param = string | string[] | undefined;
const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: Param; container?: Param; q?: Param; hours?: Param }>;
}) {
  const t = await getT();
  const params = await searchParams;

  const level = first(params.level);
  const levels: LogLevel[] =
    level === "error" ? ["error"] : level === "warn" ? ["warn"] : ["error", "warn"];
  const hours = Math.min(
    LOG_WINDOW_HOURS,
    Math.max(1, Number(first(params.hours)) || LOG_WINDOW_HOURS),
  );
  const container = first(params.container) || undefined;
  const search = first(params.q) || undefined;

  const result = await getLogs({ levels, container, search, hours });

  return (
    <AdminPage title={t("adminLogs.title")} description={t("adminLogs.description")}>
      <LogsView
        result={result}
        now={Date.now()}
        filters={{
          level: level === "error" || level === "warn" ? level : "all",
          container: container ?? "",
          q: search ?? "",
          hours,
        }}
      />
    </AdminPage>
  );
}
