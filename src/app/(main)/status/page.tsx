import React from "react";
import { Column, Flex, RevealFx, Text } from "@once-ui-system/core";
import { Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";
import { evaluateIncidents, getIncidents, getStatusSnapshot } from "@/lib/status/status";
import { getT } from "@/i18n/server";
import { IncidentCard } from "@/components/status/IncidentCard";
import {
  effectiveStatus,
  localizeAutoIncident,
  localizeAutoUpdate,
} from "@/components/status/incidentMeta";
import { StatusView } from "./StatusView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();

  return Meta.generate({
    title: `${t("site.status.metaTitle")} – ${schema.name}`,
    description: t("site.status.metaDescription"),
    baseURL,
    path: "/status",
  });
}

export default async function StatusPage() {
  const t = await getT();
  const snapshot = await getStatusSnapshot();

  // Keeps the history honest for visitors even without an external scheduler.
  await evaluateIncidents(snapshot);

  const incidents = await getIncidents();

  return (
    <Flex fillWidth horizontal="center" paddingY="40" paddingX="16">
      <Column maxWidth="m" fillWidth gap="40">
        <StatusView
          initialSnapshot={snapshot}
        />

        <RevealFx delay={900} translateY={-0.5}>
          <Column fillWidth gap="16">
            <Text variant="heading-strong-m">{t("site.status.history.title")}</Text>

            {incidents.length === 0 && (
              <Text variant="body-default-m" onBackground="neutral-weak">
                {t("site.status.history.empty")}
              </Text>
            )}

            {incidents.map((incident) => {
              const shown = localizeAutoIncident(t, incident);

              return (
                <IncidentCard
                  key={incident.id}
                  incident={{
                    title: shown.title,
                    body: shown.body,
                    severity: incident.severity,
                    status: effectiveStatus(incident),
                    component: incident.component,
                    startedAt: incident.startedAt,
                    resolvedAt: incident.resolvedAt,
                  }}
                  updates={incident.updates.map((update) => ({
                    id: update.id,
                    status: update.status,
                    body: localizeAutoUpdate(t, incident.auto, update.body),
                    createdAt: update.createdAt,
                  }))}
                />
              );
            })}
          </Column>
        </RevealFx>
      </Column>
    </Flex>
  );
}
