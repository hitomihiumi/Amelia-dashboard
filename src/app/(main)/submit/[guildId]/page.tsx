import Link from "next/link";
import { Column, Feedback, Icon, Row, Text } from "@once-ui-system/core";
import { Guild } from "@/lib/db/Guild";
import { normalizeForm } from "@/lib/moderation/forms";
import type { IconName } from "@/resources/icons";
import { getT } from "@/i18n/server";

export default async function SubmitIndexPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const { guildId } = await params;
  const guild = new Guild(guildId);

  const report = normalizeForm(await guild.get("moderation.forms.report"), "report");
  const appeal = normalizeForm(await guild.get("moderation.forms.appeal"), "appeal");

  return (
    <Column fillWidth gap="16">
      {!report.enabled && !appeal.enabled && (
        <Feedback
          variant="info"
          title={t("site.submit.index.emptyTitle")}
          description={t("site.submit.index.emptyDescription")}
        />
      )}

      {report.enabled && (
        <FormCard
          href={`/submit/${guildId}/report`}
          icon="warning"
          title={t("site.submit.index.reportTitle")}
          description={t("site.submit.index.reportDescription")}
        />
      )}

      {appeal.enabled && (
        <FormCard
          href={`/submit/${guildId}/appeal`}
          icon="refresh"
          title={t("site.submit.index.appealTitle")}
          description={t("site.submit.index.appealDescription")}
        />
      )}

      <FormCard
        href={`/submit/${guildId}/status`}
        icon="check"
        title={t("site.submit.index.statusTitle")}
        description={t("site.submit.index.statusDescription")}
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
  icon: IconName;
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
