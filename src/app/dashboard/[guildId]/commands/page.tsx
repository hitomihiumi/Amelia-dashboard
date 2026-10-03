import { Guild } from "@/lib/db/Guild";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { DiscordRole } from "@/lib/discord/role-style";
import { CommandsFrom } from "@/app/dashboard/[guildId]/commands/CommandsFrom";
import React from "react";
import { getT } from "@/i18n/server";

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
  const settings = await guild.get("permissions.commands");

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("settings.commands.title")} description={t("settings.commands.description")} />

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

      <CommandsFrom guildId={resolvedParams.guildId} permissions={settings} guildRoles={roles} />
    </Flex>
  );
}
