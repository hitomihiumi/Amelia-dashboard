import { Guild } from "@/lib/db/Guild";
import { GeneralForm } from "./GeneralForm";
import { Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { getT } from "@/i18n/server";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const resolvedParams = await params;

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("settings");

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("settings.general.title")} description={t("settings.general.description")} />

      <GeneralForm
        guildId={resolvedParams.guildId}
        defaultPrefix={settings.prefix}
        defaultLanguage={settings.language}
      />
    </Flex>
  );
}
