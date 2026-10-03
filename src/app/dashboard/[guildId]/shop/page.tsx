import { Guild } from "@/lib/db/Guild";
import { ShopFrom } from "@/app/dashboard/[guildId]/shop/ShopForm";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { ShopRole } from "@/lib/db/types";
import { getT } from "@/i18n/server";

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
  const t = await getT();
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, resolvedParams.guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("settings.shared.loadRolesFailed");
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
      <PageHeader title={t("settings.shop.title")} description={t("settings.shop.description")} />

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title={t("settings.shared.sessionExpiredTitle")}
            description={t("settings.shared.sessionExpiredText")}
          />
        ) : (
          <Feedback
            variant="danger"
            title={t("settings.shared.errorTitle")}
            description={loadError}
          />
        ))}

      <ShopFrom
        guildId={resolvedParams.guildId}
        defaultShop={{ roles: processedRoles }}
        guildRoles={roles}
      />
    </Flex>
  );
}
