import { Column, Flex, Icon, Row, Tag, Text } from "@once-ui-system/core";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import { getNextLevelXP } from "@/components/profile/cards/utils";
import type { CardTimeUnits } from "@/components/profile/cards/types";
import type { Formatters } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";
import type { ProfileGuild } from "@/lib/profile/data";
import { formatDuration } from "@/lib/profile/format";

/** What the member has done on one server: level and XP, a progress bar, messages and voice time. */
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

  return (
    <Column
      gap="16"
      padding="20"
      radius="l"
      border="neutral-alpha-medium"
      background="surface"
      minWidth={0}
    >
      <Row gap="12" vertical="center" horizontal="between" style={{ minWidth: 0 }}>
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
              {t("profile.overview.servers.levelLine", {
                level: stats.level,
                xp: format.number(stats.xp),
                next: format.number(nextXp),
              })}
            </Text>
          </Column>
        </Row>
        {guild.rank !== null && (
          <Tag size="m" scheme="brand" style={{ flexShrink: 0 }}>
            {t("profile.overview.servers.rank", { rank: guild.rank, total: guild.ranked })}
          </Tag>
        )}
      </Row>

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
          style={{ width: `${progress}%`, minWidth: progress > 0 ? 6 : 0 }}
        />
      </Row>

      <Flex horizontal="between" gap="16" wrap>
        <Row gap="8" vertical="center">
          <Icon name="actionMessage" size="xs" onBackground="neutral-weak" />
          <Text variant="body-strong-s" style={{ fontVariantNumeric: "tabular-nums" }}>
            {format.number(stats.messageCount)}
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("profile.overview.servers.messagesShort")}
          </Text>
        </Row>
        <Row gap="8" vertical="center">
          <Icon name="navPrivate" size="xs" onBackground="neutral-weak" />
          <Text variant="body-strong-s" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatDuration(stats.voiceTime, units)}
          </Text>
        </Row>
      </Flex>
    </Column>
  );
}
