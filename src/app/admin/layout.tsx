import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db/db";
import { getSiteAdmin } from "@/lib/admin/access";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import { UnsavedBar } from "@/components/layout/UnsavedBar";
import { PRIVATE_METADATA } from "@/lib/seo/metadata";
import type { Metadata } from "next";

// Only meant for signed in people: kept out of search results.
export const metadata: Metadata = { ...PRIVATE_METADATA, title: "Admin panel – Amelia" };

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
      <AppShell sidebar={<AdminSidebar adminName={admin.name} counts={{ drafts, openIncidents }} />}>
        {children}
      </AppShell>
      <UnsavedBar />
    </UnsavedChangesProvider>
  );
}
