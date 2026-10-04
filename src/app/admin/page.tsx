import React from "react";
import { prisma } from "@/lib/db/db";
import { getSiteAdmin } from "@/lib/admin/access";
import { getGlobalConfig } from "@/lib/admin/config";
import { getStatusSnapshot } from "@/lib/status/status";
import { OverviewDashboard } from "@/components/admin/overview/OverviewDashboard";

export const dynamic = "force-dynamic";

/** How many incidents / drafts are listed before "+N more". */
const LIST_SIZE = 5;

/** The overview should still render when a single query fails. */
const orElse = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
  promise.catch((error) => {
    console.error("[Admin Overview]:", error);
    return fallback;
  });

export default async function AdminOverviewPage() {
  const [admin, snapshot, config, incidentCount, incidents, draftCount, drafts, recent] =
    await Promise.all([
      getSiteAdmin(),
      getStatusSnapshot(),
      getGlobalConfig(),
      orElse(prisma.incident.count({ where: { resolvedAt: null } }), 0),
      orElse(
        prisma.incident.findMany({
          where: { resolvedAt: null },
          orderBy: { startedAt: "desc" },
          take: LIST_SIZE,
          select: { id: true, title: true, severity: true, auto: true, startedAt: true },
        }),
        [],
      ),
      orElse(prisma.newsPost.count({ where: { published: false } }), 0),
      orElse(
        prisma.newsPost.findMany({
          where: { published: false },
          orderBy: { updatedAt: "desc" },
          take: LIST_SIZE,
          select: { id: true, title: true, category: true, updatedAt: true },
        }),
        [],
      ),
      orElse(
        prisma.newsPost.findMany({
          where: { published: true },
          orderBy: { publishedAt: "desc" },
          take: LIST_SIZE,
          select: { id: true, slug: true, title: true, category: true, publishedAt: true },
        }),
        [],
      ),
    ]);

  return (
    <OverviewDashboard
      data={{
        adminName: admin?.name ?? "",
        snapshot,
        maintenance: config.maintenance,
        incidents,
        incidentCount,
        drafts,
        draftCount,
        recent,
      }}
    />
  );
}
