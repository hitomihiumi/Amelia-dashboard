import React from "react";
import { Column, Flex, Line, RevealFx, Row, Tag, Text } from "@once-ui-system/core";
import { Meta } from "@once-ui-system/core";
import type { Metadata } from "next";
import { baseURL, schema } from "@/resources";
import { evaluateIncidents, getIncidents, getStatusSnapshot } from "@/lib/status/status";
import { getFormatters, getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";
import type { Translator } from "@/i18n/translate";
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

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "neutral"> = {
  critical: "danger",
  major: "warning",
  minor: "info",
  maintenance: "neutral",
};

const SEVERITY_KEYS: Record<string, MessageKey> = {
  critical: "site.status.severity.critical",
  major: "site.status.severity.major",
  minor: "site.status.severity.minor",
  maintenance: "site.status.severity.maintenance",
};

const INCIDENT_STATUS_KEYS: Record<string, MessageKey> = {
  investigating: "site.status.incidentStatus.investigating",
  identified: "site.status.incidentStatus.identified",
  monitoring: "site.status.incidentStatus.monitoring",
  resolved: "site.status.incidentStatus.resolved",
};

const SERVICE_KEYS: Record<string, MessageKey> = {
  gateway: "site.status.services.gateway",
  database: "site.status.services.database",
  website: "site.status.services.website",
  shards: "site.status.services.shards",
};

/**
 * Incidents opened by the health check are stored in English. Those that still
 * carry the generated text are shown translated; anything an admin wrote or
 * edited is displayed exactly as stored.
 */
function localizeAutoIncident(
  t: Translator,
  incident: { auto: boolean; component: string | null; title: string; body: string | null },
) {
  let title = incident.title;
  let body = incident.body;

  if (incident.auto) {
    const match = /^.+ is (unavailable|degraded)$/.exec(incident.title);
    const serviceKey = incident.component ? SERVICE_KEYS[incident.component] : undefined;

    if (match && serviceKey) {
      title = t(
        match[1] === "unavailable"
          ? "site.status.history.autoUnavailable"
          : "site.status.history.autoDegraded",
        { service: t(serviceKey) },
      );
    }

    const shards = body ? /^(\d+)\/(\d+) ready$/.exec(body) : null;
    if (shards) {
      body = t("site.status.shardsReady", { ready: Number(shards[1]), total: Number(shards[2]) });
    }
  }

  return { title, body };
}

function localizeAutoUpdate(t: Translator, auto: boolean, body: string): string {
  if (!auto) return body;
  if (body === "Automatically detected by the health check.") {
    return t("site.status.history.autoDetected");
  }
  if (body === "The service recovered.") return t("site.status.history.autoRecovered");
  return body;
}

export default async function StatusPage() {
  const t = await getT();
  const format = await getFormatters();
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
              const incidentStatus = incident.resolvedAt ? "resolved" : incident.status;

              return (
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
                  <Text variant="heading-strong-s">{shown.title}</Text>
                  <Row gap="8" vertical="center">
                    <Tag scheme={SEVERITY_VARIANT[incident.severity] ?? "neutral"}>
                      {SEVERITY_KEYS[incident.severity]
                        ? t(SEVERITY_KEYS[incident.severity])
                        : incident.severity}
                    </Tag>
                    <Tag scheme={incident.resolvedAt ? "success" : "warning"}>
                      {INCIDENT_STATUS_KEYS[incidentStatus]
                        ? t(INCIDENT_STATUS_KEYS[incidentStatus])
                        : incidentStatus}
                    </Tag>
                  </Row>
                </Row>

                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {format.date(incident.startedAt, { dateStyle: "long" })}
                  {incident.resolvedAt
                    ? ` — ${format.date(incident.resolvedAt, { dateStyle: "long" })}`
                    : ""}
                </Text>

                {shown.body && (
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    {shown.body}
                  </Text>
                )}

                {incident.updates.length > 0 && (
                  <>
                    <Line />
                    <Column gap="8">
                      {incident.updates.map((update) => (
                        <Column key={update.id} gap="2">
                          <Text variant="label-default-s">
                            {INCIDENT_STATUS_KEYS[update.status]
                              ? t(INCIDENT_STATUS_KEYS[update.status])
                              : update.status}
                          </Text>
                          <Text variant="body-default-s" onBackground="neutral-medium">
                            {localizeAutoUpdate(t, incident.auto, update.body)}
                          </Text>
                          <Text variant="body-default-xs" onBackground="neutral-weak">
                            {format.date(update.createdAt, { dateStyle: "long" })}
                          </Text>
                        </Column>
                      ))}
                    </Column>
                  </>
                )}
              </Flex>
              );
            })}
          </Column>
        </RevealFx>
      </Column>
    </Flex>
  );
}
