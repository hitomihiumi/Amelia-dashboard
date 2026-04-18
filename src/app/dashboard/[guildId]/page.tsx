import { Guild } from "@/lib/db/Guild";
import { GeneralForm } from "./GeneralForm";
import {Flex, Text} from "@once-ui-system/core";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("settings");

  return (
      <Flex direction="column" gap="24">
        <Flex direction="column" gap="8">
          <Text variant="heading-strong-l">General settings</Text>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Configure the basic settings of your bot, such as command prefix and interface language.
          </Text>
        </Flex>

        <GeneralForm
            guildId={resolvedParams.guildId}
            defaultPrefix={settings.prefix}
            defaultLanguage={settings.language}
        />
      </Flex>
  );
}
