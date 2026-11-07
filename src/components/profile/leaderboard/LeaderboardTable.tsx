import { Column, Row, Tag, Text } from "@once-ui-system/core";
import type { CardTimeUnits } from "@/components/profile/cards/types";
import { Currency, type SlotsCurrency } from "@/components/slots/Currency";
import { AvatarWFrame } from "@/components/user/AvatarWFrame";
import type { MemberIdentity } from "@/lib/discord/members";
import { formatDuration } from "@/lib/profile/format";
import type { LeaderboardEntry, LeaderboardSort } from "@/lib/profile/leaderboard";

/** One page of a leaderboard: place, member and the number the board is sorted by. */
export function LeaderboardTable({
  sort,
  entries,
  identities,
  viewerId,
  currency,
  units,
  labels,
  numberFormat,
}: {
  sort: LeaderboardSort;
  entries: LeaderboardEntry[];
  identities: Record<string, MemberIdentity>;
  viewerId: string;
  currency: SlotsCurrency;
  units: CardTimeUnits;
  labels: {
    level: (level: number, xp: number) => string;
    you: string;
    unknown: string;
    empty: string;
  };
  numberFormat: (value: number) => string;
}) {
  if (entries.length === 0) {
    return (
      <Column
        padding="32"
        radius="l"
        border="neutral-alpha-medium"
        background="surface"
        horizontal="center"
      >
        <Text variant="body-default-m" onBackground="neutral-weak" align="center">
          {labels.empty}
        </Text>
      </Column>
    );
  }

  return (
    <Column gap="8" fillWidth>
      {entries.map((entry) => {
        const identity = identities[entry.userId];
        const name = identity?.name ?? labels.unknown;
        const isViewer = entry.userId === viewerId;

        return (
          <Row
            key={entry.userId}
            fillWidth
            gap="16"
            padding="12"
            paddingX="16"
            radius="l"
            vertical="center"
            horizontal="between"
            border={isViewer ? "brand-alpha-strong" : "neutral-alpha-medium"}
            background={isViewer ? "brand-alpha-weak" : "surface"}
          >
            <Row gap="16" vertical="center" style={{ minWidth: 0 }}>
              <Text
                variant="heading-strong-m"
                onBackground={entry.position <= 3 ? "brand-strong" : "neutral-weak"}
                style={{ minWidth: 40, fontVariantNumeric: "tabular-nums" }}
              >
                #{entry.position}
              </Text>
              <AvatarWFrame
                size="m"
                src={identity?.avatarUrl ?? undefined}
                value={identity?.avatarUrl ? undefined : Array.from(name)[0]?.toUpperCase()}
                radius="full"
              />
              <Text variant="body-strong-m" truncate>
                {name}
              </Text>
              {isViewer && (
                <Tag size="s" scheme="brand" style={{ flexShrink: 0 }}>
                  {labels.you}
                </Tag>
              )}
            </Row>

            <Row gap="8" vertical="center" style={{ flexShrink: 0 }}>
              {sort === "coins" && <Currency currency={currency} />}
              <Text variant="body-strong-m" style={{ fontVariantNumeric: "tabular-nums" }}>
                {sort === "level"
                  ? labels.level(entry.level, entry.xp)
                  : sort === "voice"
                    ? formatDuration(entry.voiceTime, units)
                    : numberFormat(entry.wallet + entry.bank)}
              </Text>
            </Row>
          </Row>
        );
      })}
    </Column>
  );
}
