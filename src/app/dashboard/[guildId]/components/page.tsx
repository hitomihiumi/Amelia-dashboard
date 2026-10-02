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
import { ComponentsManager } from "./ComponentsManager";
import type { ComponentsState } from "./componentsTypes";

export type { ComponentsState };

export default async function ComponentsPage({
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
  const initialState: ComponentsState = {
    modals: Array.isArray(components?.modals) ? components.modals : [],
    embed: Array.isArray(components?.embed) ? components.embed : [],
    buttons: Array.isArray(components?.buttons) ? components.buttons : [],
    selectMenus: Array.isArray(components?.selectMenus) ? components.selectMenus : [],
  };
  const scenarios: ScenarioCustom[] = Array.isArray(components?.scenarios)
    ? components.scenarios
    : [];

  return (
    <Flex direction="column" gap="24">
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">{t("builder.components.title")}</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          {t("builder.components.subtitle")}
        </Text>
      </RevealFx>

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title={t("builder.shared.sessionExpiredTitle")}
            description={t("builder.shared.sessionExpiredText")}
          />
        ) : (
          <Feedback variant="warning" title={t("builder.shared.partialDataTitle")} description={loadError} />
        ))}

      <ComponentsManager
        guildId={guildId}
        initialState={initialState}
        roles={roles}
        channels={channels}
        scenarios={scenarios}
      />
    </Flex>
  );
}
