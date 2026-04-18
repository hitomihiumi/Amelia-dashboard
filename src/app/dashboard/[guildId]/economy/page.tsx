import { Guild } from "@/lib/db/Guild";
import { EconomyForm } from "@/app/dashboard/[guildId]/economy/EconomyForm";
import {Flex, Text} from "@once-ui-system/core";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("economy");

  return (
      <Flex direction="column" gap="24">
        <Flex direction="column" gap="8">
          <Text variant="heading-strong-l">General economy settings</Text>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Configure the basic settings of your guild's economy, such as the income from commands and
            currency emoji.
          </Text>
        </Flex>

        <EconomyForm
            guildId={resolvedParams.guildId}
            defaultCurrency={settings.currency}
            defaultIncome={settings.income}
        />
      </Flex>
  );
}
