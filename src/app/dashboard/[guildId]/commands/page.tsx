import { Guild } from "@/lib/db/Guild";
import {Feedback, Flex, Text} from "@once-ui-system/core";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {DISCORD_SESSION_EXPIRED_ERROR} from "@/lib/auth-errors";
import {fetchGuildRoles} from "@/lib/discord/roles-api";
import {DiscordRole} from "@/lib/discord/role-style";
import {CommandsFrom} from "@/app/dashboard/[guildId]/commands/CommandsFrom";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  let roles: DiscordRole[] = [];
  let loadError: string | null = null;

  if (session?.accessToken) {
    try {
      const list = await fetchGuildRoles(session.accessToken, resolvedParams.guildId);
      roles = list.map(({ id, name, color }) => ({ id, name, color }));
    } catch (e) {
      loadError =
          e instanceof Error ? e.message : 'An unknown error occurred while loading roles.';
    }
  }


  const guild = new Guild(resolvedParams.guildId);
  const settings = await guild.get("permissions");

  return (
      <Flex direction="column" gap="24">
        <Flex direction="column" gap="8">
          <Text variant="heading-strong-l">Commands settings</Text>
          <Text variant="body-default-m" onBackground="neutral-medium">
            Configure the permissions for using bot commands in your server.
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

        <CommandsFrom
            guildId={resolvedParams.guildId}
            permissions={settings}
            guildRoles={roles}
        />

      </Flex>
  );
}
