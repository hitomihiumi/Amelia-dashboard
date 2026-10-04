import { Guild } from "@/lib/db/Guild";
import { EconomyForm } from "@/app/dashboard/[guildId]/economy/EconomyForm";
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
  const settings = await guild.get("economy");

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("settings.economy.title")} description={t("settings.economy.description")} />

      <EconomyForm
        guildId={resolvedParams.guildId}
        defaultCurrency={settings.currency}
        defaultIncome={settings.income}
      />
    </Flex>
  );
}
