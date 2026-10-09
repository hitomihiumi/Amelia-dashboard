import { Button, Column, Flex, Line, Row, Tag, Text } from "@once-ui-system/core";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { getNextLevelXP } from "@/components/profile/cards/utils";
import type { CardTimeUnits } from "@/components/profile/cards/types";
import type { Formatters } from "@/i18n/format";
import { formatDuration } from "@/lib/profile/format";
import type { ProfileGuild } from "@/lib/profile/data";
import type { Translator } from "@/i18n/translate";

/** What the member has done on one server, and a way into the card editor for it. */
export function GuildStatsCard({
  guild,
  t,
  format,
  units,
}: {
  guild: ProfileGuild;
  t: Translator;
  format: Formatters;
  units: CardTimeUnits;
}) {
  const { stats } = guild;
  const nextXp = getNextLevelXP(stats.level);
  const progress = Math.min(100, Math.max(0, (stats.xp / nextXp) * 100));

  const figures = [
    { label: t("profile.overview.servers.messages"), value: format.number(stats.messageCount) },
    { label: t("profile.overview.servers.voice"), value: formatDuration(stats.voiceTime, units) },
    {
      label: t("profile.overview.servers.balance"),
      value: format.number(stats.wallet + stats.bank),
    },
  ];

  return (
    <Column
      gap="16"
      padding="24"
      radius="l"
      border="neutral-medium"
      background="surface"
      minWidth={0}
    >
      <Flex gap="12" vertical="center" horizontal="between" style={{ minWidth: 0 }}>
        <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
          <AvatarWFrame
            size="l"
            src={guild.iconUrl ?? undefined}
            value={guild.iconUrl ? undefined : Array.from(guild.name)[0]?.toUpperCase()}
            radius="full"
          />
          <Text variant="heading-strong-s" truncate>
            {guild.name}
          </Text>
        </Row>
        {guild.rank !== null && (
          <Tag size="m" scheme="brand">
            {t("profile.overview.servers.rank", { rank: guild.rank, total: guild.ranked })}
          </Tag>
        )}
      </Flex>

      {guild.hasData ? (
        <>
          <Column gap="8">
            <Flex horizontal="between" gap="8">
              <Text variant="body-strong-s">
                {t("profile.overview.servers.level", { level: stats.level })}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {t("profile.overview.servers.xp", {
                  xp: format.number(stats.xp),
                  next: format.number(nextXp),
                })}
              </Text>
            </Flex>
            <Row
              fillWidth
              height={0.5}
              radius="full"
              background="neutral-alpha-medium"
              overflow="hidden"
              aria-hidden
            >
              <Row
                fillHeight
                radius="full"
                solid="brand-strong"
                style={{ width: `${progress}%`, minWidth: 6 }}
              />
            </Row>
          </Column>

          <Row gap="16" wrap>
            {figures.map((figure) => (
              <Column key={figure.label} gap="4" style={{ flex: "1 1 80px", minWidth: 0 }}>
                <Text variant="label-default-xs" onBackground="neutral-weak">
                  {figure.label}
                </Text>
                <Text variant="body-strong-m" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {figure.value}
                </Text>
              </Column>
            ))}
          </Row>
        </>
      ) : (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("profile.overview.servers.noActivity")}
        </Text>
      )}

      <Line />
      <Button
        variant="secondary"
        prefixIcon="palette"
        href={`/profile/appearance?guild=${guild.id}`}
        fillWidth
      >
        {t("profile.overview.servers.customize")}
      </Button>
    </Column>
  );
}
