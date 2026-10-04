import { getServerSession } from "next-auth";
import { Column, Feedback, Text } from "@once-ui-system/core";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { prisma } from "@/lib/db/db";
import { getSubmissionAccess } from "@/lib/moderation/access";
import { normalizeForm } from "@/lib/moderation/forms";
import { SubmissionForm } from "@/components/moderation/SubmissionForm";
import { SignInPrompt } from "@/components/moderation/SignInPrompt";
import { getT } from "@/i18n/server";

export default async function AppealPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const t = await getT();
  const { guildId } = await params;
  const guild = new Guild(guildId);
  const form = normalizeForm(await guild.get("moderation.forms.appeal"), "appeal");

  if (!form.enabled) {
    return (
      <Feedback
        variant="info"
        title={t("site.submit.appeal.closedTitle")}
        description={t("site.submit.appeal.closedDescription")}
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <SignInPrompt description={t("site.submit.appeal.signIn")} />
    );
  }

  const access = await getSubmissionAccess(guildId, session.user.id, "appeal");

  if (!access.allowed) {
    return (
      <Feedback
        variant="danger"
        title={t("site.submit.appeal.deniedTitle")}
        description={t("site.submit.appeal.deniedDescription")}
      />
    );
  }

  if (access.isBanned && !form.allow_banned) {
    return (
      <Feedback
        variant="danger"
        title={t("site.submit.appeal.bannedClosedTitle")}
        description={t("site.submit.appeal.bannedClosedDescription")}
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
        <Text variant="heading-strong-l">{t("site.submit.appeal.title")}</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          {t("site.submit.appeal.intro")}
        </Text>
      </Column>

      {access.isBanned && (
        <Feedback
          variant="info"
          title={t("site.submit.appeal.bannedTitle")}
          description={t("site.submit.appeal.bannedDescription")}
        />
      )}

      {cases.length === 0 && (
        <Feedback
          variant="warning"
          title={t("site.submit.appeal.noCasesTitle")}
          description={t("site.submit.appeal.noCasesDescription")}
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
          type: entry.type,
          reason: entry.reason,
          createdAt: entry.createdAt.toISOString(),
        }))}
      />
    </Column>
  );
}
