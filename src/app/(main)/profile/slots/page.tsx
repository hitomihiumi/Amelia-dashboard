import { Button, Card, Column, Feedback, Grid, RevealFx, Row, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Currency, ResponsibleBanner } from "@/components/slots";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { getFormatters, getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { type SlotsGuild, listSlotsGuilds } from "@/lib/slots/access";
import styles from "@/components/profile/Profile.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("slots.page.title")} – Amelia` };
}

/** Servers where the member can play the slot machine. */
export default async function SlotsServersPage() {
  const t = await getT();
  const format = await getFormatters();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  let guilds: SlotsGuild[] = [];
  let loadError: "session" | "generic" | null = null;

  if (!session.accessToken || session.error === "RefreshAccessTokenError") {
    loadError = "session";
  } else {
    try {
      guilds = await listSlotsGuilds(session.accessToken, session.user.id);
    } catch (error) {
      console.error("[Slots] Could not load the servers:", error);
      loadError = "generic";
    }
  }

  return (
    <>
      <PageHeader
        title={t("slots.page.title")}
        description={t("slots.page.description")}
        actions={
          <Button
            href="/profile"
            variant="tertiary"
            size="m"
            prefixIcon="back"
            label={t("slots.page.profile")}
          />
        }
      />

      <RevealFx delay={200} translateY={-0.5}>
        <ResponsibleBanner t={t} />
      </RevealFx>

      {loadError && (
        <Feedback
          variant="danger"
          title={t("slots.page.loadError")}
          description={t(
            loadError === "session" ? "slots.page.sessionExpired" : "slots.page.loadErrorHint",
          )}
        />
      )}

      {!loadError && guilds.length === 0 && (
        <Column
          gap="8"
          padding="32"
          radius="l"
          border="neutral-alpha-medium"
          background="surface"
          horizontal="center"
        >
          <Text variant="body-strong-m">{t("slots.page.empty")}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak" align="center">
            {t("slots.page.emptyHint")}
          </Text>
        </Column>
      )}

      {guilds.length > 0 && (
        <Grid
          fillWidth
          gap="16"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}
        >
          {guilds.map((guild, index) => (
            <RevealFx key={guild.id} delay={300 + index * 100} translateY={-0.5} fill>
              <Card
                href={`/profile/slots/${guild.id}`}
                fillWidth
                radius="l"
                padding="20"
                border="neutral-alpha-medium"
                background="surface"
                className={styles.linkCard}
              >
                <Column gap="16" fillWidth>
                  <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
                    <AvatarWFrame
                      size="l"
                      src={guild.iconUrl ?? undefined}
                      value={guild.iconUrl ? undefined : Array.from(guild.name)[0]?.toUpperCase()}
                      radius="full"
                    />
                    <Column gap="2" minWidth={0}>
                      <Text variant="heading-strong-s" truncate>
                        {guild.name}
                      </Text>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {t("slots.page.bets", {
                          min: format.number(guild.settings.min),
                          max: format.number(guild.settings.max),
                        })}
                      </Text>
                    </Column>
                  </Row>
                  <Row horizontal="between" vertical="center" gap="12">
                    <Column gap="2">
                      <Text
                        variant="label-default-xs"
                        onBackground="neutral-weak"
                        className={styles.eyebrow}
                      >
                        {t("slots.page.balance")}
                      </Text>
                      <Row gap="8" vertical="center">
                        <Text
                          variant="heading-strong-m"
                          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                          <Currency currency={guild.currency} />
                          {format.number(guild.wallet)}
                        </Text>
                      </Row>
                    </Column>
                    <Text variant="label-strong-s" onBackground="brand-medium">
                      {t("slots.page.play")} →
                    </Text>
                  </Row>
                </Column>
              </Card>
            </RevealFx>
          ))}
        </Grid>
      )}

      <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
        {t("slots.footer.text")}
      </Text>
    </>
  );
}
