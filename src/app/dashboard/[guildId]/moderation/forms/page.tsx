import React from "react";
import { getServerSession } from "next-auth";
import { Feedback, Flex, RevealFx, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { fetchGuildTextChannels } from "@/lib/discord/channels-api";
import { DISCORD_SESSION_EXPIRED_ERROR } from "@/lib/auth-errors";
import { normalizeForm } from "@/lib/moderation/forms";
import { baseURL } from "@/resources";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import { FormsBuilder } from "./FormsBuilder";

export default async function ModerationFormsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  let textChannels: ChannelPickOption[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      textChannels = await fetchGuildTextChannels(session.accessToken, guildId);
    } catch (e) {
      loadError =
        e instanceof Error ? e.message : "An unknown error occurred while loading channels.";
    }
  }

  const guild = new Guild(guildId);
  const report = normalizeForm(await guild.get("moderation.forms.report"), "report");
  const appeal = normalizeForm(await guild.get("moderation.forms.appeal"), "appeal");

  return (
    <Flex direction="column" gap="24">
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">Report & appeal forms</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Build the forms your members fill in. Submissions land in the channel you pick, with
          buttons for your moderators, and in the dashboard queue.
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
          <Feedback variant="danger" title="Error" description={loadError} />
        ))}

      <FormsBuilder
        guildId={guildId}
        baseUrl={baseURL}
        defaultReport={report}
        defaultAppeal={appeal}
        textChannels={textChannels}
      />
    </Flex>
  );
}
