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
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];
  let channels: GuildChannelOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const roleList = await fetchGuildRoles(session.accessToken, guildId);
      roles = roleList.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load roles";
    }
    try {
      channels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      if (!loadError) loadError = e instanceof Error ? e.message : "Failed to load channels";
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
        <Text variant="heading-strong-l">Custom components</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Build reusable Buttons, Modals, Embeds and Select Menus that power your bot's scenarios.
          Every item is reflected in the live Discord preview on the right.
        </Text>
      </RevealFx>

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title="Session expired"
            description="Your Discord session has expired. Please log in again."
          />
        ) : (
          <Feedback variant="warning" title="Partial data" description={loadError} />
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
