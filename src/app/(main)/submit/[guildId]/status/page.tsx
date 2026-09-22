import { getServerSession } from "next-auth";
import { Column, Feedback, Row, Tag, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { SUBMISSION_STATUS_LABELS } from "@/lib/moderation/embeds";
import { SignInPrompt } from "@/components/moderation/SignInPrompt";

const STATUS_VARIANT: Record<string, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  in_review: "info",
  approved: "success",
  rejected: "danger",
};

export default async function StatusPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <SignInPrompt description="Sign in with Discord to see your submissions." />;
  }

  // Scoped to the visitor: submissions are never addressable by id from the URL.
  const submissions = await prisma.moderationSubmission.findMany({
    where: { guildId, authorId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Column fillWidth gap="16">
      <Text variant="heading-strong-l">My submissions</Text>

      {submissions.length === 0 && (
        <Feedback
          variant="info"
          title="Nothing here yet"
          description="You have not sent any reports or appeals to this server."
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
              {submission.kind === "appeal" ? "Appeal" : "Report"} #{submission.number}
            </Text>
            <Tag variant={STATUS_VARIANT[submission.status] ?? "neutral"}>
              {SUBMISSION_STATUS_LABELS[submission.status] ?? submission.status}
            </Tag>
          </Row>

          <Text variant="body-default-s" onBackground="neutral-weak">
            Sent {submission.createdAt.toLocaleString()}
          </Text>

          {submission.response && (
            <Column gap="4">
              <Text variant="label-default-s">Moderator response</Text>
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
