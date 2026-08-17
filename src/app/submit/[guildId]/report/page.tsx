import { getServerSession } from "next-auth";
import { Column, Feedback, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { getSubmissionAccess } from "@/lib/moderation/access";
import { normalizeForm } from "@/lib/moderation/forms";
import { SubmissionForm } from "@/components/moderation/SubmissionForm";
import { SignInPrompt } from "@/components/moderation/SignInPrompt";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guild = new Guild(guildId);
  const form = normalizeForm(await guild.get("moderation.forms.report"), "report");

  if (!form.enabled) {
    return (
      <Feedback
        variant="info"
        title="Reports are closed"
        description="This server does not accept reports through the dashboard right now."
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <SignInPrompt description="Sign in with Discord to send a report to the moderation team." />
    );
  }

  const access = await getSubmissionAccess(guildId, session.user.id, "report");

  if (!access.allowed) {
    return (
      <Feedback
        variant="danger"
        title="Access denied"
        description="Only members of this server can send reports."
      />
    );
  }

  return (
    <Column fillWidth gap="20">
      <Column gap="8">
        <Text variant="heading-strong-l">Report a member</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Describe what happened as precisely as you can — links to the offending messages help the
          moderators a lot.
        </Text>
      </Column>

      <SubmissionForm
        guildId={guildId}
        kind="report"
        fields={form.fields}
        requireTarget={form.require_target}
        anonymous={form.allow_anonymous}
      />
    </Column>
  );
}
