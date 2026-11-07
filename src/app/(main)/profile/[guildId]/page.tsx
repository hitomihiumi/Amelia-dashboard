import { Button, Column, Feedback, Row, Tag } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { LinkCard } from "@/components/profile/overview/LinkCard";
import { StatTiles } from "@/components/profile/overview/StatTiles";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { getFormatters, getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { getServerAccess } from "@/lib/profile/guildAccess";
import { formatDuration } from "@/lib/profile/format";

/** Everything the member can do on one server: card appearance, the slot machine, leaderboards. */
export default async function ProfileServerPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const t = await getT();
  const format = await getFormatters();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const access = await getServerAccess(session, guildId);
  if (access.status === "notFound") notFound();

  const back = (
    <Button
      href="/profile"
      variant="tertiary"
      size="m"
      prefixIcon="back"
      label={t("profile.server.back")}
    />
  );

  if (access.status !== "ok") {
    return (
      <>
        <PageHeader title={t("profile.server.loadError")} actions={back} />
        <Feedback
          variant="danger"
          title={t("profile.overview.errors.title")}
          description={t(
            access.status === "session"
              ? "settings.shared.sessionExpiredText"
              : "profile.overview.errors.generic",
          )}
        />
      </>
    );
  }

  const [guild, row] = await Promise.all([
    prisma.guild.findUnique({ where: { id: guildId }, select: { slotsEnabled: true } }),
    prisma.user.findUnique({ where: { userId_guildId: { userId: session.user.id, guildId } } }),
  ]);
  if (!guild) notFound();

  const [ahead, ranked] = row
    ? await Promise.all([
        prisma.user.count({ where: { guildId, totalXp: { gt: row.totalXp } } }),
        prisma.user.count({ where: { guildId } }),
      ])
    : [0, 0];

  const units = {
    day: t("profile.overview.units.day"),
    hour: t("profile.overview.units.hour"),
    minute: t("profile.overview.units.minute"),
    second: t("profile.overview.units.second"),
  };

  return (
    <>
      <Row gap="16" vertical="center" fillWidth s={{ direction: "column", horizontal: "start" }}>
        <AvatarWFrame
          size="l"
          src={access.iconUrl ?? undefined}
          value={access.iconUrl ? undefined : Array.from(access.name)[0]?.toUpperCase()}
          radius="full"
          style={{ flexShrink: 0 }}
        />
        <Column flex={1} minWidth={0} fillWidth>
          <PageHeader
            title={access.name}
            description={t("profile.server.description")}
            badge={
              row ? (
                <Tag size="m" scheme="brand">
                  {t("profile.overview.servers.rank", { rank: ahead + 1, total: ranked })}
                </Tag>
              ) : undefined
            }
            actions={back}
          />
        </Column>
      </Row>

      <StatTiles
        start={1}
        items={[
          {
            icon: "navLevels",
            label: t("profile.server.level"),
            value: format.number(row?.level ?? 1),
            hint: t("profile.overview.totals.levelHint", { xp: format.number(row?.totalXp ?? 0) }),
          },
          {
            icon: "actionMessage",
            label: t("profile.overview.totals.messages"),
            value: format.number(row?.messageCount ?? 0),
            hint: t("profile.overview.totals.messagesHint"),
          },
          {
            icon: "navPrivate",
            label: t("profile.overview.totals.voice"),
            value: formatDuration(row?.voiceTime ?? 0, units),
            hint: t("profile.overview.totals.voiceHint"),
          },
        ]}
      />

      <Column gap="16" fillWidth>
        <LinkCard
          href={`/profile/appearance?guild=${guildId}`}
          icon="palette"
          title={t("profile.server.appearance.title")}
          description={t("profile.server.appearance.description")}
        />
        <LinkCard
          href={`/profile/${guildId}/leaderboard`}
          icon="trophy"
          title={t("profile.server.leaderboard.title")}
          description={t("profile.server.leaderboard.description")}
        />
        <LinkCard
          href={`/profile/slots/${guildId}`}
          icon="gamepad"
          title={t("profile.server.slots.title")}
          description={t("profile.server.slots.description")}
          note={guild.slotsEnabled ? undefined : t("profile.server.slots.disabled")}
        />
      </Column>
    </>
  );
}
