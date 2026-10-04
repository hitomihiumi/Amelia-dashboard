import { getServerSession } from "next-auth";
import { Column, Feedback, Row, Tag, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { SignInPrompt } from "@/components/moderation/SignInPrompt";
import { getFormatters, getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages";

const STATUS_VARIANT: Record<string, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  in_review: "info",
  approved: "success",
  rejected: "danger",
};

const STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  pending: "site.submit.statuses.pending",
  in_review: "site.submit.statuses.in_review",
  approved: "site.submit.statuses.approved",
  rejected: "site.submit.statuses.rejected",
};

export default async function StatusPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const format = await getFormatters();
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <SignInPrompt description={t("site.submit.status.signIn")} />;
  }

  // Scoped to the visitor: submissions are never addressable by id from the URL.
  const submissions = await prisma.moderationSubmission.findMany({
    where: { guildId, authorId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Column fillWidth gap="16">
      <Text variant="heading-strong-l">{t("site.submit.status.title")}</Text>

      {submissions.length === 0 && (
        <Feedback
          variant="info"
          title={t("site.submit.status.emptyTitle")}
          description={t("site.submit.status.emptyDescription")}
        />
      )}

      {submissions.map((submission) => (
        <Column
          key={submission.id}
          fillWidth
          gap="8"
          padding="16"
          radius="l"
          border="neutral-medium"
          background="surface"
        >
          <Row fillWidth horizontal="between" vertical="center" gap="8">
            <Text variant="label-default-m">
              {submission.kind === "appeal" ? t("site.submit.kinds.appeal") : t("site.submit.kinds.report")}{" "}
              #{submission.number}
            </Text>
            <Tag scheme={STATUS_VARIANT[submission.status] ?? "neutral"}>
              {STATUS_LABEL_KEYS[submission.status]
                ? t(STATUS_LABEL_KEYS[submission.status])
                : submission.status}
            </Tag>
          </Row>

          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("site.submit.status.sent", { date: format.dateTime(submission.createdAt) })}
          </Text>

          {submission.response && (
            <Column gap="4">
              <Text variant="label-default-s">{t("site.submit.status.response")}</Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                {submission.response}
              </Text>
            </Column>
          )}
        </Column>
      ))}
    </Column>
  );
}
