import React from "react";
import { Column, Text } from "@once-ui-system/core";
import { getGlobalConfig, serviceOverrides } from "@/lib/admin/config";
import { getT } from "@/i18n/server";
import { GlobalConfigForm } from "./GlobalConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const t = await getT();
  const config = await getGlobalConfig();

  return (
    <Column fillWidth gap="16">
      <Column gap="4">
        <Text variant="heading-strong-m">{t("admin.config.title")}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("admin.config.description")}
        </Text>
      </Column>

      <GlobalConfigForm config={config} overrides={serviceOverrides(config)} />
    </Column>
  );
}
