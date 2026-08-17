import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Avatar, Column, Flex, Row, Text } from "@once-ui-system/core";
import { fetchGuildBrief } from "@/lib/discord/rest";

export default async function SubmitLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  if (!/^\d{17,20}$/.test(guildId)) notFound();

  // Resolved with the bot token: a banned user is not a member any more and
  // could not see the server through their own Discord session.
  const guild = await fetchGuildBrief(guildId);
  if (!guild) notFound();

  return (
    <Flex fillWidth horizontal="center" paddingY="32" paddingX="16">
      <Column fillWidth maxWidth="s" gap="24">
        <Row gap="12" vertical="center">
          <Avatar src={guild.iconUrl || undefined} size="l" border={false} />
          <Column gap="2" style={{ minWidth: 0 }}>
            <Text variant="heading-strong-m">{guild.name}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Moderation requests
            </Text>
          </Column>
        </Row>

        {children}
      </Column>
    </Flex>
  );
}
