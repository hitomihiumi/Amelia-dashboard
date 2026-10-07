import React from "react";
import { notFound } from "next/navigation";
import { Button } from "@once-ui-system/core";
import { AdminPage } from "@/components/admin/AdminPage";
import { ServerDetailView } from "@/components/admin/servers/ServerDetailView";
import { getServerDetail } from "@/lib/admin/servers";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminServerPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  if (!/^\d{5,25}$/.test(id)) notFound();

  const server = await getServerDetail(id).catch((error) => {
    console.error("[Admin Server]:", error);
    return null;
  });
  if (!server) notFound();

  return (
    <AdminPage
      title={t("adminServers.detail.title")}
      description={t("adminServers.detail.description")}
      actions={
        <Button href="/admin/servers" variant="secondary" prefixIcon="chevronLeft">
          {t("adminServers.detail.back")}
        </Button>
      }
    >
      <ServerDetailView server={server} />
    </AdminPage>
  );
}
