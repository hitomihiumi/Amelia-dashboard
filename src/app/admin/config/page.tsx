import React from "react";
import { getGlobalConfig, serviceOverrides } from "@/lib/admin/config";
import { getT } from "@/i18n/server";
import { AdminPage } from "@/components/admin/AdminPage";
import { GlobalConfigForm } from "@/components/admin/config/GlobalConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const t = await getT();
  const config = await getGlobalConfig();

  return (
    <AdminPage width="xl" title={t("admin.config.title")} description={t("admin.config.description")}>
      {/* Only the editable fields cross to the client. */}
      <GlobalConfigForm
        config={{
          bannerEnabled: config.bannerEnabled,
          bannerText: config.bannerText,
          bannerVariant: config.bannerVariant,
          inviteUrl: config.inviteUrl,
          supportUrl: config.supportUrl,
          githubUrl: config.githubUrl,
          heroTagline: config.heroTagline,
          heroText: config.heroText,
          maintenance: config.maintenance,
          maintenanceMessage: config.maintenanceMessage,
        }}
        overrides={serviceOverrides(config)}
      />
    </AdminPage>
  );
}
