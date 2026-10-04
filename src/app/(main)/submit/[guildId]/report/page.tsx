import { getServerSession } from "next-auth";
import { Column, Feedback, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { getSubmissionAccess } from "@/lib/moderation/access";
import { normalizeForm } from "@/lib/moderation/forms";
import { SubmissionForm } from "@/components/moderation/SubmissionForm";
import { SignInPrompt } from "@/components/moderation/SignInPrompt";
import { getT } from "@/i18n/server";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const { guildId } = await params;
  const guild = new Guild(guildId);
  const form = normalizeForm(await guild.get("moderation.forms.report"), "report");

  if (!form.enabled) {
    return (
      <Feedback
        variant="info"
        title={t("site.submit.report.closedTitle")}
        description={t("site.submit.report.closedDescription")}
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <SignInPrompt description={t("site.submit.report.signIn")} />
    );
  }

  const access = await getSubmissionAccess(guildId, session.user.id, "report");

  if (!access.allowed) {
    return (
      <Feedback
        variant="danger"
        title={t("site.submit.report.deniedTitle")}
        description={t("site.submit.report.deniedDescription")}
      />
    );
  }

  return (
    <Column fillWidth gap="20">
      <Column gap="8">
        <Text variant="heading-strong-l">{t("site.submit.report.title")}</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          {t("site.submit.report.intro")}
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
