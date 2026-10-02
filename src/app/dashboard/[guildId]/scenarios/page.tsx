import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { Guild } from "@/lib/db/Guild";
import type {
  ButtonCustom,
  EmbedCustom,
  ModalCustom,
  ScenarioCustom,
  SelectMenuCustom,
} from "@/lib/db/types";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { Feedback, Flex, RevealFx, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { ScenariosManager } from "./ScenariosManager";
import type { ComponentsLibrary } from "./scenariosTypes";

export default async function ScenariosPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const t = await getT();
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];
  let channels: GuildChannelOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const roleList = await fetchGuildRoles(session.accessToken, guildId);
      roles = roleList.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("builder.shared.loadRolesFailed");
    }
    try {
      channels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      if (!loadError) loadError = e instanceof Error ? e.message : t("builder.shared.loadChannelsFailed");
    }
  }

  const guild = new Guild(guildId);
  const components = await guild.get("utils.components");
  const library: ComponentsLibrary = {
    modals: Array.isArray(components?.modals) ? (components.modals as ModalCustom[]) : [],
    embed: Array.isArray(components?.embed) ? (components.embed as EmbedCustom[]) : [],
    buttons: Array.isArray(components?.buttons) ? (components.buttons as ButtonCustom[]) : [],
    selectMenus: Array.isArray(components?.selectMenus)
      ? (components.selectMenus as SelectMenuCustom[])
      : [],
    scenarios: Array.isArray(components?.scenarios)
      ? (components.scenarios as ScenarioCustom[])
      : [],
  };

  return (
    <Flex direction="column" gap="24">
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">{t("builder.scenarios.title")}</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          {t("builder.scenarios.subtitle")}
        </Text>
      </RevealFx>

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback variant="danger" title={t("builder.shared.sessionExpiredTitle")}
            description={t("builder.scenarios.sessionExpiredText")} />
        ) : (
          <Feedback
            variant="warning"
            title={t("builder.shared.partialDataTitle")}
            description={loadError}
          />
        ))}

      <ScenariosManager
        guildId={guildId}
        initialLibrary={library}
        roles={roles}
        channels={channels}
      />
    </Flex>
  );
}
