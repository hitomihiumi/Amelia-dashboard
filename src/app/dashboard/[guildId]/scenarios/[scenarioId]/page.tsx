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
import { Button, Feedback, Flex, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import type { ComponentsLibrary } from "../scenariosTypes";
import { ScenarioEditorPage } from "./ScenarioEditorPage";

export default async function ScenarioEditorRoute({
  params,
}: {
  params: Promise<{ guildId: string; scenarioId: string }>;
}) {
  const { guildId, scenarioId } = await params;
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

  const scenario = library.scenarios.find((s) => s.id === scenarioId) ?? null;

  return (
    <Flex direction="column" gap="24" fillWidth>
      <Flex direction="row" gap="8" vertical="center" wrap>
        <Button
          variant="secondary"
          size="s"
          prefixIcon="back"
          href={`/dashboard/${guildId}/scenarios`}
        >
          All scenarios
        </Button>
      </Flex>

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback variant="danger" title="Session expired" description="Please log in again." />
        ) : (
          <Feedback variant="warning" title="Partial data" description={loadError} />
        ))}

      {scenario ? (
        <ScenarioEditorPage
          guildId={guildId}
          initialScenario={scenario}
          library={library}
          roles={roles}
          channels={channels}
        />
      ) : (
        <Feedback variant="warning" title="Not found" description="Scenario does not exist." />
      )}
    </Flex>
  );
}
