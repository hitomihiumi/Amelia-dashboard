import React from "react";
import { Column, Flex, Line, Row, Tag, Text } from "@once-ui-system/core";
import { Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";
import {
  evaluateIncidents,
  formatUptime,
  getIncidents,
  getStatusSnapshot,
} from "@/lib/status/status";
import { formatDate } from "@/app/utils/formatDate";
import { StatusView } from "./StatusView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return Meta.generate({
    title: `Status – ${schema.name}`,
    description: "Live availability of the bot, the database and the website.",
    baseURL,
    path: "/status",
  });
}

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  critical: "danger",
  major: "warning",
  minor: "info",
  maintenance: "neutral",
};

export default async function StatusPage() {
  const snapshot = await getStatusSnapshot();

  // Keeps the history honest for visitors even without an external scheduler.
  await evaluateIncidents(snapshot);

  const incidents = await getIncidents();

  return (
    <Flex fillWidth horizontal="center" paddingY="40" paddingX="16">
      <Column maxWidth="m" fillWidth gap="40">
        <StatusView
          initialSnapshot={snapshot}
          uptimeLabel={formatUptime(snapshot.metrics.uptimeMs)}
        />

        <Column fillWidth gap="16">
          <Text variant="heading-strong-m">Incident history</Text>

          {incidents.length === 0 && (
            <Text variant="body-default-m" onBackground="neutral-weak">
              No incidents recorded yet.
            </Text>
          )}

          {incidents.map((incident) => (
            <Flex
              key={incident.id}
              direction="column"
              fillWidth
              gap="12"
              padding="20"
              radius="l"
              border="neutral-medium"
              background="surface"
            >
              <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
                <Text variant="heading-strong-s">{incident.title}</Text>
                <Row gap="8" vertical="center">
                  <Tag variant={SEVERITY_VARIANT[incident.severity] ?? "neutral"}>
                    {incident.severity}
                  </Tag>
                  <Tag variant={incident.resolvedAt ? "success" : "warning"}>
                    {incident.resolvedAt ? "resolved" : incident.status}
                  </Tag>
                </Row>
              </Row>

              <Text variant="body-default-xs" onBackground="neutral-weak">
                {formatDate(incident.startedAt.toISOString())}
                {incident.resolvedAt ? ` — ${formatDate(incident.resolvedAt.toISOString())}` : ""}
              </Text>

              {incident.body && (
                <Text variant="body-default-s" onBackground="neutral-medium">
                  {incident.body}
                </Text>
              )}

              {incident.updates.length > 0 && (
                <>
                  <Line />
                  <Column gap="8">
                    {incident.updates.map((update) => (
                      <Column key={update.id} gap="2">
                        <Text variant="label-default-s">{update.status}</Text>
                        <Text variant="body-default-s" onBackground="neutral-medium">
                          {update.body}
                        </Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          {formatDate(update.createdAt.toISOString())}
                        </Text>
                      </Column>
                    ))}
                  </Column>
                </>
              )}
            </Flex>
          ))}
        </Column>
      </Column>
    </Flex>
  );
}
