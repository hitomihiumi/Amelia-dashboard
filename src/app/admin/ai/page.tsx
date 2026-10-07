import React from "react";
import { Column } from "@once-ui-system/core";
import { AdminPage } from "@/components/admin/AdminPage";
import { getAiGlobalConfig, listPremiumGuilds } from "@/lib/admin/ai";
import { getT } from "@/i18n/server";
import { AiLimitsForm } from "./AiLimitsForm";
import { PremiumPanel } from "./PremiumPanel";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const t = await getT();
  const [config, guilds] = await Promise.all([getAiGlobalConfig(), listPremiumGuilds()]);

  return (
    <AdminPage title={t("adminAi.title")} description={t("adminAi.description")}>
      <Column fillWidth gap="24" paddingBottom="80">
        <AiLimitsForm config={config} />
        <PremiumPanel guilds={guilds} />
      </Column>
    </AdminPage>
  );
}
