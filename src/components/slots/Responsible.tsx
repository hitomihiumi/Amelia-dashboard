import { Column, Feedback, Icon, Row, Text } from "@once-ui-system/core";
import { memo } from "react";
import type { Translator } from "@/i18n/translate";

/**
 * The short reminder that sits on top of every page of the game. It cannot be closed: the slot
 * machine only ever uses the virtual currency of a Discord server, and says so all the time.
 */
export const ResponsibleBanner = memo(function ResponsibleBanner({ t }: { t: Translator }) {
  return (
    <Feedback
      variant="warning"
      icon="warning"
      title={t("slots.banner.title")}
      description={t("slots.banner.text")}
      role="note"
    />
  );
});

const POINTS = ["point1", "point2", "point3", "point4", "point5"] as const;

/** Everything the player should know before spinning, as a list. */
export const ResponsibleNotice = memo(function ResponsibleNotice({
  t,
  compact,
  titleId,
}: {
  t: Translator;
  compact?: boolean;
  /** Id of the title, for a dialog that is labelled by it. */
  titleId?: string;
}) {
  return (
    <Column gap={compact ? "12" : "16"} fillWidth>
      <Column gap="4">
        <Text variant={compact ? "heading-strong-s" : "heading-strong-m"} id={titleId}>
          {t("slots.notice.title")}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.notice.intro")}
        </Text>
      </Column>
      <Column as="ul" gap="8" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {POINTS.map((point) => (
          <Row as="li" key={point} gap="12" vertical="start">
            <Icon
              name={point === "point5" ? "info" : point === "point3" ? "danger" : "check"}
              size="s"
              onBackground={point === "point3" ? "danger-medium" : "brand-medium"}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Text variant="body-default-s">{t(`slots.notice.${point}`)}</Text>
          </Row>
        ))}
      </Column>
    </Column>
  );
});
