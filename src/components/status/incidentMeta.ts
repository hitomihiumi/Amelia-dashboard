import type { MessageKey } from "@/i18n/messages";
import type { Translator } from "@/i18n/translate";

export const SEVERITIES = ["minor", "major", "critical", "maintenance"] as const;
export type IncidentSeverity = (typeof SEVERITIES)[number];

export const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_COMPONENTS = ["gateway", "database", "website", "shards"] as const;
export type IncidentComponent = (typeof INCIDENT_COMPONENTS)[number];

export type ToneScheme = "danger" | "warning" | "info" | "success" | "neutral" | "brand";

/** The same severity → colour mapping the public status page has always used. */
export const SEVERITY_TONE: Record<IncidentSeverity, ToneScheme> = {
  critical: "danger",
  major: "warning",
  minor: "info",
  maintenance: "neutral",
};

/** Red while someone is looking, warmer to cooler along the way, green once it is over. */
export const STATUS_TONE: Record<IncidentStatus, ToneScheme> = {
  investigating: "danger",
  identified: "warning",
  monitoring: "info",
  resolved: "success",
};

export const SEVERITY_LABEL_KEYS: Record<IncidentSeverity, MessageKey> = {
  critical: "site.status.severity.critical",
  major: "site.status.severity.major",
  minor: "site.status.severity.minor",
  maintenance: "site.status.severity.maintenance",
};

export const STATUS_LABEL_KEYS: Record<IncidentStatus, MessageKey> = {
  investigating: "site.status.incidentStatus.investigating",
  identified: "site.status.incidentStatus.identified",
  monitoring: "site.status.incidentStatus.monitoring",
  resolved: "site.status.incidentStatus.resolved",
};

export const COMPONENT_LABEL_KEYS: Record<IncidentComponent, MessageKey> = {
  gateway: "site.status.services.gateway",
  database: "site.status.services.database",
  website: "site.status.services.website",
  shards: "site.status.services.shards",
};

export function isSeverity(value: string): value is IncidentSeverity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export function isIncidentStatus(value: string): value is IncidentStatus {
  return (INCIDENT_STATUSES as readonly string[]).includes(value);
}

export function isIncidentComponent(value: string): value is IncidentComponent {
  return (INCIDENT_COMPONENTS as readonly string[]).includes(value);
}

/** Tone of a stored severity; anything unknown falls back to neutral like the public page. */
export function severityTone(severity: string): ToneScheme {
  return isSeverity(severity) ? SEVERITY_TONE[severity] : "neutral";
}

export function statusTone(status: string): ToneScheme {
  return isIncidentStatus(status) ? STATUS_TONE[status] : "neutral";
}

/** A resolved timestamp wins over whatever the status column says. */
export function effectiveStatus(incident: {
  status: string;
  resolvedAt: Date | string | null;
}): string {
  return incident.resolvedAt ? "resolved" : incident.status;
}

/**
 * Incidents opened by the health check are stored in English. Those that still
 * carry the generated text are shown translated; anything an admin wrote or
 * edited is displayed exactly as stored.
 */
export function localizeAutoIncident(
  t: Translator,
  incident: { auto: boolean; component: string | null; title: string; body: string | null },
): { title: string; body: string | null } {
  let title = incident.title;
  let body = incident.body;

  if (incident.auto) {
    const match = /^.+ is (unavailable|degraded)$/.exec(incident.title);
    const serviceKey =
      incident.component && isIncidentComponent(incident.component)
        ? COMPONENT_LABEL_KEYS[incident.component]
        : undefined;

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

export function localizeAutoUpdate(t: Translator, auto: boolean, body: string): string {
  if (!auto) return body;
  if (body === "Automatically detected by the health check.") {
    return t("site.status.history.autoDetected");
  }
  if (body === "The service recovered.") return t("site.status.history.autoRecovered");
  return body;
}

/** Serializable incident shape shared by the status page and the admin screens. */
export interface IncidentUpdateView {
  id: string;
  status: string;
  body: string;
  createdAt: Date | string;
}

export interface IncidentView {
  id: string;
  title: string;
  body: string | null;
  severity: string;
  status: string;
  component: string | null;
  auto: boolean;
  startedAt: Date | string;
  resolvedAt: Date | string | null;
  updates: IncidentUpdateView[];
}

export const toMs = (value: Date | string | number): number => new Date(value).getTime();
