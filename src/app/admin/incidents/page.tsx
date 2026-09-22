import React from "react";
import { Column, Text } from "@once-ui-system/core";
import { getIncidents } from "@/lib/status/status";
import { IncidentsManager } from "./IncidentsManager";

export const dynamic = "force-dynamic";

export default async function AdminIncidentsPage() {
  const incidents = await getIncidents(50);

  return (
    <Column fillWidth gap="16">
      <Column gap="4">
        <Text variant="heading-strong-m">Incidents</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Manual entries live next to the ones the health check opens on its own.
        </Text>
      </Column>

      <IncidentsManager incidents={incidents} />
    </Column>
  );
}
