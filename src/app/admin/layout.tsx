import React from "react";
import { notFound } from "next/navigation";
import { Flex } from "@once-ui-system/core";
import { prisma } from "@/lib/db/db";
import { getSiteAdmin } from "@/lib/admin/access";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import { UnsavedBar } from "@/components/layout/UnsavedBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The panel is invisible to everyone else — a 404, not a 403.
  const admin = await getSiteAdmin();
  if (!admin) notFound();

  const [drafts, openIncidents] = await Promise.all([
    prisma.newsPost.count({ where: { published: false } }).catch(() => 0),
    prisma.incident.count({ where: { resolvedAt: null } }).catch(() => 0),
  ]);

  return (
    <UnsavedChangesProvider>
      <UnsavedNavigationGuard />
      {/* Grows with the page so the sticky sidebar stays in view while the content scrolls. */}
      <Flex fillWidth direction="row" m={{ direction: "column" }} style={{ minHeight: "100vh" }}>
        <AdminSidebar adminName={admin.name} counts={{ drafts, openIncidents }} />
        <Flex fill horizontal="center" style={{ minWidth: 0 }}>
          <Flex direction="column" fillWidth padding="24" gap="24" style={{ minWidth: 0 }}>
            {children}
          </Flex>
        </Flex>
      </Flex>
      <UnsavedBar />
    </UnsavedChangesProvider>
  );
}
