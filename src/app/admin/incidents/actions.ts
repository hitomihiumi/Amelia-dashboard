"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireSiteAdmin } from "@/lib/admin/access";
import {
  isIncidentComponent,
  isIncidentStatus,
  isSeverity,
} from "@/components/status/incidentMeta";
import { getT } from "@/i18n/server";

export type IncidentActionResult = { ok: true; id?: string } | { ok: false; error: string };

const TITLE_MIN = 3;
const TITLE_MAX = 200;
const BODY_MAX = 2000;

function revalidateIncidents(id?: string) {
  revalidatePath("/status");
  revalidatePath("/");
  revalidatePath("/admin/incidents");
  if (id) revalidatePath(`/admin/incidents/${id}`);
}

/**
 * Keeps the incident row in step with its timeline: the newest update decides the
 * status, and `resolvedAt` is set exactly while that status is "resolved". An
 * incident without any update is left as it is.
 */
async function syncIncidentState(
  tx: Pick<typeof prisma, "incidentUpdate" | "incident">,
  incidentId: string,
) {
  const latest = await tx.incidentUpdate.findFirst({
    where: { incidentId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!latest) return;

  const incident = await tx.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return;

  await tx.incident.update({
    where: { id: incidentId },
    data: {
      status: latest.status,
      resolvedAt: latest.status === "resolved" ? (incident.resolvedAt ?? latest.createdAt) : null,
    },
  });
}

/** Manually opened incident, optionally with the first message. */
export async function createIncident(input: {
  title: string;
  body?: string;
  severity: string;
  component?: string | null;
}): Promise<IncidentActionResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const title = String(input?.title ?? "").trim();
    const body = String(input?.body ?? "").trim();
    const severity = String(input?.severity ?? "minor");
    const component = String(input?.component ?? "").trim();

    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return { ok: false, error: t("adminIncidents.errors.titleLength") };
    }
    if (!isSeverity(severity)) {
      return { ok: false, error: t("adminIncidents.errors.unknownSeverity") };
    }
    if (component && !isIncidentComponent(component)) {
      return { ok: false, error: t("adminIncidents.errors.unknownComponent") };
    }
    if (body.length > BODY_MAX) {
      return { ok: false, error: t("adminIncidents.errors.bodyLength") };
    }

    const incident = await prisma.incident.create({
      data: {
        title,
        body: body || null,
        severity,
        component: component || null,
        auto: false,
        updates: body ? { create: { status: "investigating", body } } : undefined,
      },
    });

    revalidateIncidents(incident.id);
    return { ok: true, id: incident.id };
  } catch (error) {
    console.error("[Admin Incident Create Error]:", error);
    return { ok: false, error: t("adminIncidents.errors.createFailed") };
  }
}

/** Post an update on an incident. "resolved" closes it, any other status (re)opens it. */
export async function addIncidentUpdate(input: {
  incidentId: string;
  status: string;
  body: string;
}): Promise<IncidentActionResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const incidentId = String(input?.incidentId ?? "");
    const status = String(input?.status ?? "monitoring");
    const body = String(input?.body ?? "").trim();

    if (!isIncidentStatus(status)) {
      return { ok: false, error: t("adminIncidents.errors.unknownStatus") };
    }
    if (!body || body.length > BODY_MAX) {
      return { ok: false, error: t("adminIncidents.errors.updateLength") };
    }

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return { ok: false, error: t("adminIncidents.errors.incidentNotFound") };

    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status,
        resolvedAt: status === "resolved" ? (incident.resolvedAt ?? new Date()) : null,
        updates: { create: { status, body } },
      },
    });

    revalidateIncidents(incidentId);
    return { ok: true };
  } catch (error) {
    console.error("[Admin Incident Update Error]:", error);
    return { ok: false, error: t("adminIncidents.errors.updateFailed") };
  }
}

/** Edit the title, severity or component of an incident. */
export async function updateIncident(input: {
  id: string;
  title: string;
  severity: string;
  component?: string | null;
}): Promise<IncidentActionResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const id = String(input?.id ?? "");
    const title = String(input?.title ?? "").trim();
    const severity = String(input?.severity ?? "");
    const component = String(input?.component ?? "").trim();

    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return { ok: false, error: t("adminIncidents.errors.titleLength") };
    }
    if (!isSeverity(severity)) {
      return { ok: false, error: t("adminIncidents.errors.unknownSeverity") };
    }
    if (component && !isIncidentComponent(component)) {
      return { ok: false, error: t("adminIncidents.errors.unknownComponent") };
    }

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) return { ok: false, error: t("adminIncidents.errors.incidentNotFound") };

    // The health check finds its own incidents by component; moving one would make it
    // open a duplicate for the service that is still broken.
    if (incident.auto && (incident.component ?? "") !== component) {
      return { ok: false, error: t("adminIncidents.errors.autoComponentLocked") };
    }

    await prisma.incident.update({
      where: { id },
      data: { title, severity, component: component || null },
    });

    revalidateIncidents(id);
    return { ok: true, id };
  } catch (error) {
    console.error("[Admin Incident Edit Error]:", error);
    return { ok: false, error: t("adminIncidents.errors.updateFailed") };
  }
}

/** Change the text or status of one entry on the timeline. */
export async function editIncidentUpdate(input: {
  id: string;
  status: string;
  body: string;
}): Promise<IncidentActionResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const id = String(input?.id ?? "");
    const status = String(input?.status ?? "");
    const body = String(input?.body ?? "").trim();

    if (!isIncidentStatus(status)) {
      return { ok: false, error: t("adminIncidents.errors.unknownStatus") };
    }
    if (!body || body.length > BODY_MAX) {
      return { ok: false, error: t("adminIncidents.errors.updateLength") };
    }

    const update = await prisma.incidentUpdate.findUnique({ where: { id } });
    if (!update) return { ok: false, error: t("adminIncidents.errors.updateNotFound") };

    await prisma.$transaction(async (tx) => {
      await tx.incidentUpdate.update({ where: { id }, data: { status, body } });
      await syncIncidentState(tx, update.incidentId);
    });

    revalidateIncidents(update.incidentId);
    return { ok: true, id: update.incidentId };
  } catch (error) {
    console.error("[Admin Incident Update Edit Error]:", error);
    return { ok: false, error: t("adminIncidents.errors.updateFailed") };
  }
}

/** Remove one entry from the timeline; the incident falls back to what the newest remaining entry says. */
export async function deleteIncidentUpdate(id: string): Promise<IncidentActionResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    const update = await prisma.incidentUpdate.findUnique({ where: { id: String(id ?? "") } });
    if (!update) return { ok: false, error: t("adminIncidents.errors.updateNotFound") };

    await prisma.$transaction(async (tx) => {
      await tx.incidentUpdate.delete({ where: { id: update.id } });
      await syncIncidentState(tx, update.incidentId);
    });

    revalidateIncidents(update.incidentId);
    return { ok: true, id: update.incidentId };
  } catch (error) {
    console.error("[Admin Incident Update Delete Error]:", error);
    return { ok: false, error: t("adminIncidents.errors.updateDeleteFailed") };
  }
}

export async function deleteIncident(id: string): Promise<IncidentActionResult> {
  const t = await getT();
  try {
    const gate = await requireSiteAdmin();
    if (!gate.ok) return gate;

    await prisma.incident.delete({ where: { id: String(id ?? "") } });

    revalidateIncidents();
    return { ok: true };
  } catch (error) {
    console.error("[Admin Incident Delete Error]:", error);
    return { ok: false, error: t("adminIncidents.errors.deleteFailed") };
  }
}
