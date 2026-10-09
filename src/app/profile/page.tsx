import { Feedback, Grid, Column, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { GuildStatsCard } from "@/components/profile/overview/GuildStatsCard";
import { StatTiles } from "@/components/profile/overview/StatTiles";
import { getFormatters, getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { formatDuration } from "@/lib/profile/format";
import { getProfileGuilds, summarize } from "@/lib/profile/data";
import type { ProfileGuild } from "@/lib/profile/data";
import { redirect } from "next/navigation";

export default async function ProfileOverviewPage() {
  const t = await getT();
  const format = await getFormatters();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const units = {
    day: t("profile.units.day"),
    hour: t("profile.units.hour"),
    minute: t("profile.units.minute"),
    second: t("profile.units.second"),
  };

  let guilds: ProfileGuild[] = [];
  let loadError: "session" | "rateLimit" | "generic" | null = null;

  if (!session.accessToken || session.error === "RefreshAccessTokenError") {
    loadError = "session";
  } else {
    try {
      guilds = await getProfileGuilds(session.accessToken, session.user.id);
    } catch (e) {
      console.error("[Profile] Could not load the servers:", e);
      loadError =
        e instanceof Error && e.message === "discord_rate_limit" ? "rateLimit" : "generic";
    }
  }

  const totals = summarize(guilds);

  return (
    <>
      <PageHeader
        title={t("profile.overview.title")}
        description={t("profile.overview.description")}
      />

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
          <StatTiles
            items={[
              {
                icon: "navServers",
                label: t("profile.overview.totals.servers"),
                value: format.number(totals.servers),
                hint: t("profile.overview.totals.serversHint", { active: totals.activeServers }),
              },
              {
                icon: "mail",
                label: t("profile.overview.totals.messages"),
                value: format.number(totals.messages),
              },
              {
                icon: "microphone",
                label: t("profile.overview.totals.voice"),
                value: formatDuration(totals.voiceTime, units),
              },
              {
                icon: "navLevels",
                label: t("profile.overview.totals.level"),
                value: format.number(totals.topLevel),
                hint: `${format.number(totals.totalXp)} ${t("profile.overview.totals.xp")}`,
              },
              {
                icon: "trophy",
                label: t("profile.overview.totals.rank"),
                value: totals.bestRank === null ? "—" : `#${format.number(totals.bestRank)}`,
                hint: t("profile.overview.totals.rankHint"),
              },
              {
                icon: "money",
                label: t("profile.overview.totals.money"),
                value: format.number(totals.money),
                hint: t("profile.overview.totals.moneyHint"),
              },
            ]}
          />

          <Column gap="16" fillWidth>
            <Column gap="4">
              <Text variant="heading-strong-m">{t("profile.overview.servers.title")}</Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                {t("profile.overview.servers.description")}
              </Text>
            </Column>

            {guilds.length === 0 ? (
              <Column
                gap="8"
                padding="32"
                radius="l"
                border="neutral-medium"
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
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }}
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
