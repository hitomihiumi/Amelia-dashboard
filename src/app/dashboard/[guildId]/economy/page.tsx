import { Guild } from "@/lib/db/Guild";
import { EconomyForm } from "@/app/dashboard/[guildId]/economy/EconomyForm";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("economy");

  return (
    <EconomyForm
      guildId={resolvedParams.guildId}
      defaultCurrency={settings.currency}
      defaultIncome={settings.income}
    />
  );
}
