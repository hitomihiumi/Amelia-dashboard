import React from "react";
import { Button } from "@once-ui-system/core";
import { AdminPage } from "@/components/admin/AdminPage";
import { IncidentForm } from "@/components/admin/incidents/IncidentForm";
import { getT } from "@/i18n/server";
import { createIncident } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const t = await getT();

  return (
    <AdminPage
      width="xl"
      title={t("adminIncidents.form.title")}
      description={t("adminIncidents.form.description")}
      actions={
        <Button href="/admin/incidents" variant="tertiary" prefixIcon="arrowLeft">
          {t("adminIncidents.form.back")}
        </Button>
      }
    >
      <IncidentForm actions={{ createIncident }} />
    </AdminPage>
  );
}
