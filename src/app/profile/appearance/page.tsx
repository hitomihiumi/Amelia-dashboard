import { Button, Column, Feedback, Text } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppearanceEditor, type EditorGuild } from "@/components/profile/AppearanceEditor";
import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";
import { getProfileGuilds, type ProfileGuild } from "@/lib/profile/data";
import { cardIdentity } from "@/lib/profile/identity";

export default async function AppearancePage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string | string[] }>;
}) {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { guild: guildParam } = await searchParams;
  const wanted = Array.isArray(guildParam) ? guildParam[0] : guildParam;

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

  const header = (
    <PageHeader
      title={t("profile.appearance.title")}
      description={t("profile.appearance.description")}
      actions={
        <Button variant="secondary" prefixIcon="user" href="/profile">
          {t("profile.appearance.backToProfile")}
        </Button>
      }
    />
  );

  if (loadError) {
    return (
      <>
        {header}
        {loadError === "session" ? (
          <Feedback
            variant="danger"
            title={t("settings.shared.sessionExpiredTitle")}
            description={t("settings.shared.sessionExpiredText")}
          />
        ) : (
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
      </>
    );
  }

  if (guilds.length === 0) {
    return (
      <>
        {header}
        <Column
          gap="8"
          padding="32"
          radius="l"
          border="neutral-medium"
          background="surface"
          horizontal="center"
        >
          <Text variant="body-strong-m" align="center">
            {t("profile.appearance.noServers")}
          </Text>
        </Column>
      </>
    );
  }

  const editorGuilds: EditorGuild[] = guilds.map((g) => ({
    id: g.id,
    name: g.name,
    stats: { level: g.stats.level, xp: g.stats.xp, voiceTime: g.stats.voiceTime },
    appearance: g.appearance,
  }));

  return (
    <AppearanceEditor
      guilds={editorGuilds}
      initialGuildId={editorGuilds.find((g) => g.id === wanted)?.id ?? editorGuilds[0].id}
      identity={cardIdentity(session.user)}
      units={{
        day: t("profile.units.day"),
        hour: t("profile.units.hour"),
        minute: t("profile.units.minute"),
        second: t("profile.units.second"),
      }}
    />
  );
}
