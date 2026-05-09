import { Guild } from "@/lib/db/Guild";
import { ShopFrom } from "@/app/dashboard/[guildId]/shop/ShopForm";
import { Feedback, Flex, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { ShopRole } from "@/lib/db/types";

const shopRolesProcesse = (roles: ShopRole[]): ShopRole[] => {
  const now = new Date().getTime();
  return roles.map((role: ShopRole) => {
    const hasDiscount = role.discount && role.discount.amount > 0;
    const isDiscountActive =
      hasDiscount &&
      (!role.discount.starts_at || role.discount.starts_at <= now) &&
      (!role.discount.expires_at || role.discount.expires_at > now);
    return {
      ...role,
      discount: {
        ...role.discount,
        amount: isDiscountActive ? role.discount.amount : 0,
        starts_at: isDiscountActive ? role.discount.starts_at : null,
        expires_at: isDiscountActive ? role.discount.expires_at : null,
      },
    };
  });
};

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, resolvedParams.guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : "An unknown error occurred while loading roles.";
    }
  }

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("economy.shop");

  const processedRoles = shopRolesProcesse(settings.roles);

  if (settings.roles !== processedRoles) {
    await guild.set("economy.shop.roles", processedRoles);
  }

  return (
    <Flex direction="column" gap="24">
      <Flex direction="column" gap="8">
        <Text variant="heading-strong-l">Roles shop</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Configure the roles that users can buy in the shop. You can set the price and the role for
          each item.
        </Text>
      </Flex>

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title="Session expired"
            description="Your Discord session has expired. Please log in again."
          />
        ) : (
          <Feedback variant="danger" title="Error" description={loadError} />
        ))}

      <ShopFrom
        guildId={resolvedParams.guildId}
        defaultShop={{ roles: processedRoles }}
        guildRoles={roles}
      />
    </Flex>
  );
}
