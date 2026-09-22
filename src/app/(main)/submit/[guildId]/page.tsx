import Link from "next/link";
import { Column, Feedback, Icon, Row, Text } from "@once-ui-system/core";
import { Guild } from "@/lib/db/Guild";
import { normalizeForm } from "@/lib/moderation/forms";

export default async function SubmitIndexPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = new Guild(guildId);

  const report = normalizeForm(await guild.get("moderation.forms.report"), "report");
  const appeal = normalizeForm(await guild.get("moderation.forms.appeal"), "appeal");

  return (
    <Column fillWidth gap="16">
      {!report.enabled && !appeal.enabled && (
        <Feedback
          variant="info"
          title="Nothing to submit"
          description="This server has not enabled any moderation forms yet."
        />
      )}

      {report.enabled && (
        <FormCard
          href={`/submit/${guildId}/report`}
          icon="warning"
          title="Report a member"
          description="Tell the moderation team about a rule violation. Members of the server only."
        />
      )}

      {appeal.enabled && (
        <FormCard
          href={`/submit/${guildId}/appeal`}
          icon="refresh"
          title="Appeal a punishment"
          description="Ask the moderation team to review a warn, mute or ban you received. Available even if you are banned."
        />
      )}

      <FormCard
        href={`/submit/${guildId}/status`}
        icon="check"
        title="My submissions"
        description="See the status of everything you have sent to this server."
      />
    </Column>
  );
}

function FormCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Row
        fillWidth
        gap="16"
        padding="20"
        radius="l"
        border="neutral-medium"
        background="surface"
        vertical="center"
      >
        <Icon name={icon} onBackground="neutral-medium" />
        <Column gap="4">
          <Text variant="heading-strong-s">{title}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {description}
          </Text>
        </Column>
      </Row>
    </Link>
  );
}
