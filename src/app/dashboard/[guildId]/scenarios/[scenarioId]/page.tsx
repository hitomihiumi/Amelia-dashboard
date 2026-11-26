import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { Guild } from "@/lib/db/Guild";
import { early } from "@/lib/utils";
import type {
  ButtonCustom,
  EmbedCustom,
  ModalCustom,
  ScenarioCustom,
  SelectMenuCustom,
  LayoutCustom,
} from "@/lib/db/types";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import { fetchGuildRoles } from "@/lib/discord/roles-api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Feedback, Flex } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import type { ComponentsLibrary } from "../scenariosTypes";
import { ScenarioEditorPage } from "./ScenarioEditorPage";

export default async function ScenarioEditorRoute({
  params,
}: {
  params: Promise<{ guildId: string; scenarioId: string }>;
}) {
  const { guildId, scenarioId } = await params;
  const t = await getT();
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];
  let channels: GuildChannelOption[] = [];
  let loadError: string | null = null;

  // Started first: the database read overlaps with the Discord requests.
  const componentsPromise = early(new Guild(guildId).get("utils.components"));

  if (session?.accessToken) {
    const accessToken = session.accessToken;
    // Roles and channels are independent requests, so they go out together.
    const [rolesResult, channelsResult] = await Promise.allSettled([
      fetchGuildRoles(accessToken, guildId),
      fetchGuildTextChannels(accessToken, guildId),
    ]);
    if (rolesResult.status === "fulfilled") {
      roles = rolesResult.value.map(({ id, name, color }) => ({ id, name, color }));
    } else {
      const e = rolesResult.reason;
      loadError = e instanceof Error ? e.message : t("builder.shared.loadRolesFailed");
    }
    if (channelsResult.status === "fulfilled") {
      channels = channelsResult.value;
    } else if (!loadError) {
      const e = channelsResult.reason;
      loadError = e instanceof Error ? e.message : t("builder.shared.loadChannelsFailed");
    }
  }

  const components = await componentsPromise;
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
    layouts: Array.isArray(components?.layouts) ? (components.layouts as LayoutCustom[]) : [],
  };

  const scenario = library.scenarios.find((s) => s.id === scenarioId) ?? null;

  return (
    <Flex direction="column" gap="24" fillWidth>
      <PageHeader
        title={scenario?.name || t("builder.scenarios.untitled")}
        actions={
          <Button
            variant="secondary"
            size="s"
            prefixIcon="back"
            href={`/dashboard/${guildId}/scenarios`}
          >
            {t("builder.scenarios.allScenarios")}
          </Button>
        }
      />

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

      {scenario ? (
        <ScenarioEditorPage
          guildId={guildId}
          initialScenario={scenario}
          library={library}
          roles={roles}
          channels={channels}
        />
      ) : (
        <Feedback
          variant="warning"
          title={t("builder.scenarios.notFoundTitle")}
          description={t("builder.scenarios.notFoundText")}
        />
      )}
    </Flex>
  );
}
