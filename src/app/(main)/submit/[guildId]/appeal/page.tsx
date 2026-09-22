import { getServerSession } from "next-auth";
import { Column, Feedback, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { prisma } from "@/lib/db/db";
import { getSubmissionAccess } from "@/lib/moderation/access";
import { normalizeForm } from "@/lib/moderation/forms";
import { CASE_TYPE_LABELS } from "@/lib/moderation/embeds";
import { SubmissionForm } from "@/components/moderation/SubmissionForm";
import { SignInPrompt } from "@/components/moderation/SignInPrompt";

export default async function AppealPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = new Guild(guildId);
  const form = normalizeForm(await guild.get("moderation.forms.appeal"), "appeal");

  if (!form.enabled) {
    return (
      <Feedback
        variant="info"
        title="Appeals are closed"
        description="This server does not accept appeals through the dashboard right now."
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <SignInPrompt description="Sign in with Discord to appeal a punishment. This works even if you are banned from the server." />
    );
  }

  const access = await getSubmissionAccess(guildId, session.user.id, "appeal");

  if (!access.allowed) {
    return (
      <Feedback
        variant="danger"
        title="Access denied"
        description="Only members of this server, or users punished on it, can appeal."
      />
    );
  }

  if (access.isBanned && !form.allow_banned) {
    return (
      <Feedback
        variant="danger"
        title="Appeals are not open to banned users"
        description="This server does not accept appeals from banned users."
      />
    );
  }

  // Only the visitor's own punishments are offered for appeal.
  const cases = await prisma.moderationCase.findMany({
    where: {
      guildId,
      targetId: session.user.id,
      type: { in: ["warn", "mute", "ban", "kick"] },
    },
    orderBy: { caseNumber: "desc" },
    take: 25,
    select: { id: true, caseNumber: true, type: true, reason: true, createdAt: true },
  });

  return (
    <Column fillWidth gap="20">
      <Column gap="8">
        <Text variant="heading-strong-l">Appeal a punishment</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Explain why the punishment should be lifted. A moderator will review your appeal and you
          will receive the answer in a direct message.
        </Text>
      </Column>

      {access.isBanned && (
        <Feedback
          variant="info"
          title="You are banned from this server"
          description="You can still submit this appeal. If it is approved, the ban is lifted automatically."
        />
      )}

      {cases.length === 0 && (
        <Feedback
          variant="warning"
          title="No punishments found"
          description="We could not find any punishment issued to you on this server. You can still submit the form and describe your case."
        />
      )}

      <SubmissionForm
        guildId={guildId}
        kind="appeal"
        fields={form.fields}
        requireTarget={false}
        anonymous={false}
        cases={cases.map((entry) => ({
          id: entry.id,
          caseNumber: entry.caseNumber,
          type: CASE_TYPE_LABELS[entry.type] ?? entry.type,
          reason: entry.reason,
          createdAt: entry.createdAt.toISOString(),
        }))}
      />
    </Column>
  );
}
