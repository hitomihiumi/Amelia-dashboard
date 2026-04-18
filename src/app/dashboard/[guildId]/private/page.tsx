import { Guild } from "@/lib/db/Guild";
import { PrivateForm } from "@/app/dashboard/[guildId]/private/PrivateForm";
import {Feedback, Flex, Text} from "@once-ui-system/core";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {ChannelPickOption} from "@/lib/discord/channel-type";
import {fetchGuildTextVoiceAndCategories} from "@/lib/discord/channels-api";
import {DISCORD_SESSION_EXPIRED_ERROR} from "@/lib/auth-errors";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
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
      voiceChannels = bundle.voiceChannels.map((c) => ({...c}));
      categories = bundle.categories.map((c) => ({...c}));
    } catch (e) {
      loadError =
          e instanceof Error ? e.message : 'An unknown error occurred while loading channels.';
    }
  }


  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("utils.join_to_create");

  return (
      <Flex direction="column" gap="24">
        <Flex direction="column" gap="8">
          <Text variant="heading-strong-l">Private rooms settings</Text>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Configure the settings for private voice channels in your server.
          </Text>
        </Flex>

        {loadError && (
            loadError === DISCORD_SESSION_EXPIRED_ERROR ? (
                <Feedback
                    variant="danger"
                    title="Session expired"
                    description="Your Discord session has expired. Please log in again."
                />
            ) : (
                <Feedback
                    variant="danger"
                    title="Error"
                    description={loadError}
                />
            )
        )}

        <PrivateForm guildId={resolvedParams.guildId} defaultJTC={settings} voiceChannels={voiceChannels} categories={categories} />
      </Flex>
  );
}
