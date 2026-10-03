import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { Guild } from "@/lib/db/Guild";
import type {
  ButtonCustom,
  EmbedCustom,
  LayoutCustom,
  ModalCustom,
  ScenarioCustom,
  SelectMenuCustom,
} from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Feedback, Flex } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import type { ComponentsLibrary } from "../scenarios/scenariosTypes";
import { SendComposer } from "./SendComposer";

export default async function SendPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const t = await getT();
  const session = await getServerSession(authOptions);

  let channels: GuildChannelOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      channels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("builder.shared.loadChannelsFailed");
    }
  }

  const components = await new Guild(guildId).get("utils.components");
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

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("send.title")} description={t("send.subtitle")} />

      {loadError &&
        (loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
          <Feedback
            variant="danger"
            title={t("builder.shared.sessionExpiredTitle")}
            description={t("builder.scenarios.sessionExpiredText")}
          />
        ) : (
          <Feedback
            variant="warning"
            title={t("builder.shared.partialDataTitle")}
            description={loadError}
          />
        ))}

      <SendComposer guildId={guildId} library={library} channels={channels} />
    </Flex>
  );
}
