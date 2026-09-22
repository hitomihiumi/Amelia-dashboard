import React from "react";
import { Column, Text } from "@once-ui-system/core";
import { getGlobalConfig, serviceOverrides } from "@/lib/admin/config";
import { GlobalConfigForm } from "./GlobalConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const config = await getGlobalConfig();

  return (
    <Column fillWidth gap="16">
      <Column gap="4">
        <Text variant="heading-strong-m">Global configuration</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Settings that apply to the whole site, not to a single server.
        </Text>
      </Column>

      <GlobalConfigForm config={config} overrides={serviceOverrides(config)} />
    </Column>
  );
}
