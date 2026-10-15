import { Button, Feedback, Row, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsibleBanner, SlotMachine } from "@/components/slots";
import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/db";
import { SNOWFLAKE, findMemberGuild } from "@/lib/slots/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("slots.page.title")} – Amelia` };
}

/** The slot machine of one server. */
export default async function SlotsGamePage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");
  if (!SNOWFLAKE.test(guildId)) notFound();

  const back = (
    <Button
      href="/profile/slots"
      variant="tertiary"
      size="m"
      prefixIcon="back"
      label={t("slots.page.back")}
    />
  );

  if (!session.accessToken || session.error === "RefreshAccessTokenError") {
    return (
      <>
        <PageHeader title={t("slots.page.title")} actions={back} />
        <Feedback
          variant="danger"
          title={t("slots.page.loadError")}
          description={t("slots.page.sessionExpired")}
        />
      </>
    );
  }

  let member: Awaited<ReturnType<typeof findMemberGuild>>;
  try {
    member = await findMemberGuild(session.accessToken, guildId);
  } catch (error) {
    console.error("[Slots] Could not check the membership:", error);
    return (
      <>
        <PageHeader title={t("slots.page.title")} actions={back} />
        <Feedback
          variant="danger"
          title={t("slots.page.loadError")}
          description={t("slots.page.loadErrorHint")}
        />
      </>
    );
  }
  // Only servers the member is on, and that Amelia is on.
  if (!member) notFound();

  const [guild, row] = await Promise.all([
    prisma.guild.findUnique({
      where: { id: guildId },
      select: {
        slotsEnabled: true,
        slotsMinBet: true,
        slotsMaxBet: true,
        slotsCooldown: true,
        currencyEmoji: true,
        currencyId: true,
      },
    }),
    prisma.user.findUnique({
      where: { userId_guildId: { userId: session.user.id, guildId } },
      select: {
        wallet: true,
        slotsTimeout: true,
        slotsFreeSpins: true,
        slotsFreeBet: true,
        slotsFreeLines: true,
        slotsFreeWon: true,
      },
    }),
  ]);
  if (!guild) notFound();

  const header = (
    <PageHeader title={member.name} description={t("slots.page.description")} actions={back} />
  );

  if (!guild.slotsEnabled) {
    return (
      <>
        {header}
        <ResponsibleBanner t={t} />
        <Feedback
          variant="info"
          title={t("slots.page.disabledTitle")}
          description={t("slots.page.disabledText")}
        />
      </>
    );
  }

  const wallet = row?.wallet ?? 0;
  const cooldownLeftMs = row?.slotsTimeout
    ? Math.max(0, row.slotsTimeout.getTime() + guild.slotsCooldown * 1000 - Date.now())
    : 0;

  return (
    <>
      {header}
      <SlotMachine
        guildId={guildId}
        min={guild.slotsMinBet}
        max={guild.slotsMaxBet}
        cooldown={guild.slotsCooldown}
        currency={{ emoji: guild.currencyEmoji, id: guild.currencyId }}
        wallet={wallet}
        cooldownLeftMs={cooldownLeftMs}
        freeState={
          row && row.slotsFreeSpins > 0
            ? {
                left: row.slotsFreeSpins,
                perLine: row.slotsFreeBet,
                lines: row.slotsFreeLines,
                won: row.slotsFreeWon,
              }
            : null
        }
      />
      {wallet < guild.slotsMinBet && (
        <Row horizontal="center">
          <Text variant="body-default-s" onBackground="neutral-weak" align="center">
            {t("slots.page.walletEmpty")}
          </Text>
        </Row>
      )}
    </>
  );
}
