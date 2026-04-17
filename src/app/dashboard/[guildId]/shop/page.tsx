import { Guild } from "@/lib/db/Guild";
import { ShopFrom } from "@/app/dashboard/[guildId]/shop/ShopForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import type { DiscordRole } from "@/lib/discord/role-style";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, resolvedParams.guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {}
  }

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("economy.shop");

  return <ShopFrom guildId={resolvedParams.guildId} defaultShop={settings} guildRoles={roles} />;
}
