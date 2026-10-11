import { PageHeader } from "@/components/layout/PageHeader";
import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { Guild } from "@/lib/db/Guild";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import { fetchGuildTextVoiceAndCategories } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { normalizeFindTeam } from "@/lib/games/findTeam";
import { Feedback, Flex } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { GamesForm } from "./GamesForm";

export default async function GamesSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  let textChannels: ChannelPickOption[] = [];
  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
      const bundle = await fetchGuildTextVoiceAndCategories(session.accessToken, guildId);
      textChannels = bundle.textChannels.map((c) => ({ ...c }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("settings.shared.loadChannelsRolesFailed");
    }
  }

  const settings = normalizeFindTeam(await new Guild(guildId).get("utils.find_team"));

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("games.title")} description={t("games.description")} />

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

      <GamesForm
        guildId={guildId}
        defaultSettings={settings}
        textChannels={textChannels}
        roles={roles}
      />
    </Flex>
  );
}
