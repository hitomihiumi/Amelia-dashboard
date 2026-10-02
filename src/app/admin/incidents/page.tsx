import React from "react";
import { Column, Text } from "@once-ui-system/core";
import { getIncidents } from "@/lib/status/status";
import { getT } from "@/i18n/server";
import { IncidentsManager } from "./IncidentsManager";

export const dynamic = "force-dynamic";

export default async function AdminIncidentsPage() {
  const t = await getT();
  const incidents = await getIncidents(50);

  return (
    <Column fillWidth gap="16">
      <Column gap="4">
        <Text variant="heading-strong-m">{t("admin.incidents.title")}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("admin.incidents.description")}
        </Text>
      </Column>

      <IncidentsManager incidents={incidents} />
    </Column>
  );
}
