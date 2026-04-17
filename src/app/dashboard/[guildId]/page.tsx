import { Guild } from "@/lib/db/Guild";
import { GeneralForm } from "./GeneralForm";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("settings");

  return (
    <GeneralForm
      guildId={resolvedParams.guildId}
      defaultPrefix={settings.prefix}
      defaultLanguage={settings.language}
    />
  );
}
