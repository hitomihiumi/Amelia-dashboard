import { Card, Column, Feedback, Grid, Icon, Row, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { GuildStatsCard } from "@/components/profile/overview/GuildStatsCard";
import { ProfileHeader } from "@/components/profile/overview/ProfileHeader";
import { StatTiles } from "@/components/profile/overview/StatTiles";
import styles from "@/components/profile/Profile.module.scss";
import { getFormatters, getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { type ProfileGuild, getProfileGuilds, summarize } from "@/lib/profile/data";
import { formatDuration } from "@/lib/profile/format";

export default async function ProfileOverviewPage() {
  const t = await getT();
  const format = await getFormatters();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { user } = session;
  const units = {
    day: t("profile.overview.units.day"),
    hour: t("profile.overview.units.hour"),
    minute: t("profile.overview.units.minute"),
    second: t("profile.overview.units.second"),
  };

  let guilds: ProfileGuild[] = [];
  let loadError: "session" | "rateLimit" | "generic" | null = null;

  if (!session.accessToken || session.error === "RefreshAccessTokenError") {
    loadError = "session";
  } else {
    try {
      guilds = await getProfileGuilds(session.accessToken, user.id);
    } catch (e) {
      console.error("[Profile] Could not load the servers:", e);
      loadError =
        e instanceof Error && e.message === "discord_rate_limit" ? "rateLimit" : "generic";
    }
  }

  const totals = summarize(guilds);

  return (
    <>
      <ProfileHeader
        name={user.username || user.name || "User"}
        description={t("profile.overview.description")}
        avatar={user.image ? `${user.image}?size=256` : undefined}
        frame={user.avatarDecoration ? `${user.avatarDecoration}?size=96` : null}
      />

      <Card
        href="/profile/appearance"
        fillWidth
        radius="l"
        padding="16"
        border="neutral-alpha-medium"
        background="surface"
        className={styles.linkCard}
      >
        <Row fillWidth gap="16" vertical="center">
          <Row
            center
            radius="m"
            background="brand-alpha-weak"
            border="brand-alpha-medium"
            style={{ width: 48, height: 48, flexShrink: 0 }}
          >
            <Icon name="palette" size="m" onBackground="brand-strong" />
          </Row>
          <Column gap="4" flex={1} minWidth={0}>
            <Text variant="heading-strong-s">{t("profile.overview.appearanceLink.title")}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("profile.overview.appearanceLink.description")}
            </Text>
          </Column>
          <Icon name="chevronRight" size="s" onBackground="neutral-weak" />
        </Row>
      </Card>

      {loadError === "session" && (
        <Feedback
          variant="danger"
          title={t("settings.shared.sessionExpiredTitle")}
          description={t("settings.shared.sessionExpiredText")}
        />
      )}
      {(loadError === "rateLimit" || loadError === "generic") && (
        <Feedback
          variant="danger"
          title={t("profile.overview.errors.title")}
          description={t(
            loadError === "rateLimit"
              ? "profile.overview.errors.rateLimit"
              : "profile.overview.errors.generic",
          )}
        />
      )}

      {!loadError && (
        <>
          <Column gap="16" fillWidth>
            <Text variant="label-default-s" onBackground="neutral-weak" className={styles.eyebrow}>
              {t("profile.overview.total")}
            </Text>
            <StatTiles
              items={[
                {
                  icon: "navServers",
                  label: t("profile.overview.totals.servers"),
                  value: format.number(totals.servers),
                  hint: t("profile.overview.totals.serversHint"),
                },
                {
                  icon: "navLevels",
                  label: t("profile.overview.totals.level"),
                  value: format.number(totals.totalLevel),
                  hint: t("profile.overview.totals.levelHint", {
                    xp: format.number(totals.totalXp),
                  }),
                },
                {
                  icon: "actionMessage",
                  label: t("profile.overview.totals.messages"),
                  value: format.number(totals.messages),
                  hint: t("profile.overview.totals.messagesHint"),
                },
                {
                  icon: "navPrivate",
                  label: t("profile.overview.totals.voice"),
                  value: formatDuration(totals.voiceTime, units),
                  hint: t("profile.overview.totals.voiceHint"),
                },
              ]}
            />
          </Column>

          <Column gap="16" fillWidth>
            <Text variant="label-default-s" onBackground="neutral-weak" className={styles.eyebrow}>
              {t("profile.overview.byServer")}
            </Text>
            {guilds.length === 0 ? (
              <Column
                gap="8"
                padding="32"
                radius="l"
                border="neutral-alpha-medium"
                background="surface"
                horizontal="center"
              >
                <Text variant="body-strong-m">{t("profile.overview.servers.empty")}</Text>
                <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                  {t("profile.overview.servers.emptyHint")}
                </Text>
              </Column>
            ) : (
              <Grid
                fillWidth
                gap="16"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))" }}
              >
                {guilds.map((guild) => (
                  <GuildStatsCard
                    key={guild.id}
                    guild={guild}
                    t={t}
                    format={format}
                    units={units}
                  />
                ))}
              </Grid>
            )}
          </Column>
        </>
      )}
    </>
  );
}
