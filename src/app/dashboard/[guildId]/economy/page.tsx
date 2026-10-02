import { Guild } from "@/lib/db/Guild";
import { EconomyForm } from "@/app/dashboard/[guildId]/economy/EconomyForm";
import { Flex, RevealFx, Text } from "@once-ui-system/core";
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
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">{t("settings.economy.title")}</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          {t("settings.economy.description")}
        </Text>
      </RevealFx>

      <EconomyForm
        guildId={resolvedParams.guildId}
        defaultCurrency={settings.currency}
        defaultIncome={settings.income}
      />
    </Flex>
  );
}
