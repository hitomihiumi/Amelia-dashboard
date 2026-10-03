import React from "react";
import { Button } from "@once-ui-system/core";
import { AdminPage } from "@/components/admin/AdminPage";
import { IncidentsList } from "@/components/admin/incidents/IncidentsList";
import { getIncidents } from "@/lib/status/status";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const t = await getT();
  const { tab } = await searchParams;
  const incidents = await getIncidents(200);

  return (
    <AdminPage
      title={t("adminIncidents.list.title")}
      description={t("adminIncidents.list.description")}
      actions={
        <Button href="/admin/incidents/new" prefixIcon="plus">
          {t("adminIncidents.list.report")}
        </Button>
      }
    >
      <IncidentsList
        incidents={incidents}
        now={Date.now()}
        initialTab={tab === "history" ? "history" : "active"}
      />
    </AdminPage>
  );
}
