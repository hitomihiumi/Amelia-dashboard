import "server-only";

import type { Incident, IncidentUpdate } from "@prisma/client";
import { prisma, mongoClient } from "@/lib/db/db";
import { getGlobalConfig, serviceOverrides } from "@/lib/admin/config";

/** A heartbeat older than this means the shard stopped reporting. */
const HEARTBEAT_TTL_MS = 90_000;

const STATUS_COLLECTION = "bot_status";

export type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

export type ServiceKey = "gateway" | "database" | "website" | "shards";

export interface ServiceState {
  key: ServiceKey;
  label: string;
  status: ServiceStatus;
  note: string | null;
}

export interface StatusMetrics {
  ping: number | null;
  uptimeMs: number | null;
  shards: { total: number; ready: number };
  guilds: number;
  members: number;
  commands: number;
  lastHeartbeat: string | null;
}

export interface StatusSnapshot {
  overall: ServiceStatus;
  services: ServiceState[];
  metrics: StatusMetrics;
  checkedAt: string;
}

interface HeartbeatDocument {
  shardId: number;
  status: "online" | "offline";
  ping: number;
  guildCount: number;
  memberCount: number;
  commandCount: number;
  uptimeMs: number;
  startedAt: Date;
  version: string;
  updatedAt: Date;
}

const SERVICE_LABELS: Record<ServiceKey, string> = {
  gateway: "Discord Gateway",
  database: "Database",
  website: "Website",
  shards: "Shards",
};

/** Heartbeats the bot writes every 30 seconds. */
async function readHeartbeats(): Promise<HeartbeatDocument[]> {
  try {
    const db = mongoClient.db(process.env.MONGODB_DB_NAME || "amelia_cache");
    return await db.collection<HeartbeatDocument>(STATUS_COLLECTION).find({}).toArray();
  } catch (error) {
    console.error("[Status] Failed to read the heartbeats:", error);
    return [];
  }
}

async function databaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[Status] The database is unreachable:", error);
    return false;
  }
}

const SEVERITY: Record<ServiceStatus, number> = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  down: 3,
};

/** Current state of every service, with the manual overrides applied. */
export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const [heartbeats, dbUp, config] = await Promise.all([
    readHeartbeats(),
    databaseReachable(),
    getGlobalConfig(),
  ]);

  const now = Date.now();
  const fresh = heartbeats.filter(
    (beat) => now - new Date(beat.updatedAt).getTime() < HEARTBEAT_TTL_MS,
  );
  const ready = fresh.filter((beat) => beat.status === "online");

  const total = heartbeats.length || 1;
  const lastHeartbeat = heartbeats
    .map((beat) => new Date(beat.updatedAt).getTime())
    .sort((a, b) => b - a)[0];

  const gateway: ServiceStatus =
    ready.length === 0 ? "down" : ready.length < total ? "degraded" : "operational";

  const services: ServiceState[] = [
    { key: "gateway", label: SERVICE_LABELS.gateway, status: gateway, note: null },
    {
      key: "database",
      label: SERVICE_LABELS.database,
      status: dbUp ? "operational" : "down",
      note: null,
    },
    // The page is being rendered, so the website is up by definition.
    { key: "website", label: SERVICE_LABELS.website, status: "operational", note: null },
    {
      key: "shards",
      label: SERVICE_LABELS.shards,
      status: gateway,
      note: heartbeats.length ? `${ready.length}/${total} ready` : null,
    },
  ];

  // Manual overrides win over the measurement, and maintenance wins over both.
  const overrides = serviceOverrides(config);

  for (const service of services) {
    const override = overrides[service.key];
    if (override?.status && override.status in SEVERITY) {
      service.status = override.status as ServiceStatus;
      service.note = override.note ?? service.note;
    }

    if (config.maintenance) {
      service.status = "maintenance";
      service.note = config.maintenanceMessage ?? service.note;
    }
  }

  const overall = config.maintenance
    ? "maintenance"
    : services.reduce<ServiceStatus>(
        (worst, service) => (SEVERITY[service.status] > SEVERITY[worst] ? service.status : worst),
        "operational",
      );

  const sum = (pick: (beat: HeartbeatDocument) => number) =>
    fresh.reduce((acc, beat) => acc + (pick(beat) || 0), 0);

  return {
    overall,
    services,
    metrics: {
      ping: fresh.length ? Math.round(sum((beat) => beat.ping) / fresh.length) : null,
      uptimeMs: fresh.length ? Math.max(...fresh.map((beat) => beat.uptimeMs || 0)) : null,
      shards: { total: heartbeats.length, ready: ready.length },
      guilds: sum((beat) => beat.guildCount),
      members: sum((beat) => beat.memberCount),
      commands: fresh.length ? Math.max(...fresh.map((beat) => beat.commandCount || 0)) : 0,
      lastHeartbeat: lastHeartbeat ? new Date(lastHeartbeat).toISOString() : null,
    },
    checkedAt: new Date().toISOString(),
  };
}

export type IncidentWithUpdates = Incident & { updates: IncidentUpdate[] };

export async function getIncidents(take = 20): Promise<IncidentWithUpdates[]> {
  return await prisma.incident.findMany({
    orderBy: { startedAt: "desc" },
    take,
    include: { updates: { orderBy: { createdAt: "asc" } } },
  });
}

/**
 * Open an incident for every service that broke, and close the automatic ones
 * whose service recovered. Writes only when the state actually changed, so it
 * is safe to call on every page render.
 */
export async function evaluateIncidents(snapshot: StatusSnapshot): Promise<void> {
  try {
    const open = await prisma.incident.findMany({ where: { resolvedAt: null, auto: true } });

    for (const service of snapshot.services) {
      const existing = open.find((incident) => incident.component === service.key);
      const broken = service.status === "down" || service.status === "degraded";

      if (broken && !existing) {
        await prisma.incident.create({
          data: {
            title: `${service.label} is ${service.status === "down" ? "unavailable" : "degraded"}`,
            body: service.note,
            severity: service.status === "down" ? "critical" : "major",
            status: "investigating",
            component: service.key,
            auto: true,
            updates: {
              create: {
                status: "investigating",
                body: "Automatically detected by the health check.",
              },
            },
          },
        });
      }

      if (!broken && existing) {
        await prisma.incident.update({
          where: { id: existing.id },
          data: {
            status: "resolved",
            resolvedAt: new Date(),
            updates: {
              create: { status: "resolved", body: "The service recovered." },
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("[Status] Failed to evaluate incidents:", error);
  }
}

/** Compact duration used by the status page and the landing ("20h 40m"). */
export function formatUptime(uptimeMs: number | null): string {
  if (!uptimeMs || uptimeMs < 0) return "—";

  const minutes = Math.floor(uptimeMs / 60_000) % 60;
  const hours = Math.floor(uptimeMs / 3_600_000) % 24;
  const days = Math.floor(uptimeMs / 86_400_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
