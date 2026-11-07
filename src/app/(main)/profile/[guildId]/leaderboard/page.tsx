import { Button, Column, Feedback, Row, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeaderboardTable } from "@/components/profile/leaderboard/LeaderboardTable";
import { getFormatters, getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { getMemberIdentities } from "@/lib/discord/members";
import { getServerAccess } from "@/lib/profile/guildAccess";
import {
  LEADERBOARD_SORTS,
  type LeaderboardSort,
  getLeaderboard,
  parsePage,
  parseSort,
} from "@/lib/profile/leaderboard";
import styles from "@/components/profile/Profile.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("profile.leaderboard.title")} – Amelia` };
}

const TAB_ICONS = { level: "navLevels", voice: "navPrivate", coins: "money" } as const;

const href = (guildId: string, sort: LeaderboardSort, page: number) =>
  `/profile/${guildId}/leaderboard?sort=${sort}${page > 1 ? `&page=${page}` : ""}`;

/** The server's rankings by level, voice time and coins: the same three boards as `/leaderboard`. */
export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ sort?: string | string[]; page?: string | string[] }>;
}) {
  const { guildId } = await params;
  const query = await searchParams;
  const t = await getT();
  const format = await getFormatters();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const access = await getServerAccess(session, guildId);
  if (access.status === "notFound") notFound();

  const back = (
    <Button
      href={`/profile/${guildId}`}
      variant="tertiary"
      size="m"
      prefixIcon="back"
      label={t("profile.server.backToServer")}
    />
  );

  if (access.status !== "ok") {
    return (
      <>
        <PageHeader title={t("profile.leaderboard.title")} actions={back} />
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

  const sort = parseSort(query.sort);
  const [board, guild] = await Promise.all([
    getLeaderboard(guildId, sort, parsePage(query.page), session.user.id),
    prisma.guild.findUnique({
      where: { id: guildId },
      select: { currencyEmoji: true, currencyId: true },
    }),
  ]);
  const identities = await getMemberIdentities(
    guildId,
    board.entries.map((entry) => entry.userId),
  );

  const units = {
    day: t("profile.overview.units.day"),
    hour: t("profile.overview.units.hour"),
    minute: t("profile.overview.units.minute"),
    second: t("profile.overview.units.second"),
  };

  return (
    <>
      <PageHeader
        title={t("profile.leaderboard.title")}
        description={t("profile.leaderboard.description", { server: access.name })}
        actions={back}
      />

      <Row gap="8" wrap>
        {LEADERBOARD_SORTS.map((tab) => (
          <Button
            key={tab}
            href={href(guildId, tab, 1)}
            variant={tab === sort ? "primary" : "secondary"}
            size="m"
            prefixIcon={TAB_ICONS[tab]}
            label={t(`profile.leaderboard.tabs.${tab}`)}
          />
        ))}
      </Row>

      <Column gap="16" fillWidth>
        <Row horizontal="between" vertical="center" gap="16" wrap>
          <Text variant="label-default-s" onBackground="neutral-weak" className={styles.eyebrow}>
            {t(`profile.leaderboard.titles.${sort}`)}
          </Text>
          {board.viewerPosition !== null && (
            <Text variant="label-strong-s" onBackground="brand-medium">
              {t("profile.leaderboard.yourPlace", { position: board.viewerPosition })}
            </Text>
          )}
        </Row>

        <LeaderboardTable
          sort={sort}
          entries={board.entries}
          identities={Object.fromEntries(identities)}
          viewerId={session.user.id}
          currency={{ emoji: guild?.currencyEmoji ?? null, id: guild?.currencyId ?? null }}
          units={units}
          labels={{
            level: (level, xp) =>
              t("profile.leaderboard.levelValue", { level, xp: format.number(xp) }),
            you: t("profile.leaderboard.you"),
            unknown: t("profile.leaderboard.unknownMember"),
            empty: t("profile.leaderboard.empty"),
          }}
          numberFormat={(value) => format.number(value)}
        />

        <Row horizontal="between" vertical="center" gap="16" wrap>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("profile.leaderboard.footer", {
              page: board.page,
              pages: board.pages,
              total: format.number(board.total),
            })}
          </Text>
          <Row gap="8">
            {board.page > 1 ? (
              <Button
                href={href(guildId, sort, board.page - 1)}
                variant="secondary"
                size="m"
                prefixIcon="chevronLeft"
                label={t("profile.leaderboard.prev")}
              />
            ) : (
              <Button
                variant="secondary"
                size="m"
                prefixIcon="chevronLeft"
                disabled
                label={t("profile.leaderboard.prev")}
              />
            )}
            {board.page < board.pages ? (
              <Button
                href={href(guildId, sort, board.page + 1)}
                variant="secondary"
                size="m"
                suffixIcon="chevronRight"
                label={t("profile.leaderboard.next")}
              />
            ) : (
              <Button
                variant="secondary"
                size="m"
                suffixIcon="chevronRight"
                disabled
                label={t("profile.leaderboard.next")}
              />
            )}
          </Row>
        </Row>
      </Column>
    </>
  );
}
