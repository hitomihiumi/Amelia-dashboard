import { Column, Grid, Icon, Row, Text } from "@once-ui-system/core";
import styles from "@/components/profile/Profile.module.scss";
import type { IconName } from "@/resources/icons";

export interface StatTileData {
  icon: IconName;
  label: string;
  value: string;
  hint: string;
}

/** The headline numbers of the profile: label with icon, the number, a line of context. */
export function StatTiles({ items }: { items: StatTileData[] }) {
  return (
    <Grid
      fillWidth
      gap="16"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}
    >
      {items.map((item) => (
        <Column
          key={item.label}
          gap="12"
          padding="20"
          radius="l"
          border="neutral-alpha-medium"
          background="surface"
          minWidth={0}
        >
          <Row gap="8" vertical="center">
            <Icon name={item.icon} size="s" onBackground="neutral-weak" />
            <Text variant="label-default-s" onBackground="neutral-weak" className={styles.eyebrow}>
              {item.label}
            </Text>
          </Row>
          <Text variant="heading-strong-xl" style={{ fontVariantNumeric: "tabular-nums" }}>
            {item.value}
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {item.hint}
          </Text>
        </Column>
      ))}
    </Grid>
  );
}
