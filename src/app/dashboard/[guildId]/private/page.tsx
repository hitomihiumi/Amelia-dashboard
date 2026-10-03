import { Guild } from "@/lib/db/Guild";
import { PrivateForm } from "@/app/dashboard/[guildId]/private/PrivateForm";
import { Feedback, Flex } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChannelPickOption } from "@/lib/discord/channel-type";
import { fetchGuildTextVoiceAndCategories } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { getT } from "@/i18n/server";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  let voiceChannels: ChannelPickOption[] = [];
  let categories: ChannelPickOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const bundle = await fetchGuildTextVoiceAndCategories(
        session.accessToken,
        resolvedParams.guildId,
      );
      voiceChannels = bundle.voiceChannels.map((c) => ({ ...c }));
      categories = bundle.categories.map((c) => ({ ...c }));
    } catch (e) {
      loadError = e instanceof Error ? e.message : t("settings.shared.loadChannelsFailed");
    }
  }

  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("utils.join_to_create");

  return (
    <Flex direction="column" gap="24">
      <PageHeader title={t("settings.private.title")} description={t("settings.private.description")} />

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

      <PrivateForm
        guildId={resolvedParams.guildId}
        defaultJTC={settings}
        voiceChannels={voiceChannels}
        categories={categories}
      />
    </Flex>
  );
}
