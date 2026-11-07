import { Card, Column, Icon, Row, Tag, Text } from "@once-ui-system/core";
import styles from "@/components/profile/Profile.module.scss";
import type { IconName } from "@/resources/icons";

/** A card of the profile that leads to another page: icon, title, a line of context, chevron. */
export function LinkCard({
  href,
  icon,
  title,
  description,
  note,
}: {
  href: string;
  icon: IconName;
  title: string;
  description: string;
  /** Small chip next to the title, e.g. "Turned off". */
  note?: string;
}) {
  return (
    <Card
      href={href}
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
          <Icon name={icon} size="m" onBackground="brand-strong" />
        </Row>
        <Column gap="4" flex={1} minWidth={0}>
          <Row gap="8" vertical="center" wrap>
            <Text variant="heading-strong-s">{title}</Text>
            {note && (
              <Tag size="s" scheme="neutral">
                {note}
              </Tag>
            )}
          </Row>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {description}
          </Text>
        </Column>
        <Icon name="chevronRight" size="s" onBackground="neutral-weak" />
      </Row>
    </Card>
  );
}
