import { Column, Flex, Grid, Icon, Text } from "@once-ui-system/core";
import type { IconName } from "@/resources/icons";

export interface StatTileData {
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
}

/** The headline numbers of the profile, as many per row as fit. */
export function StatTiles({ items }: { items: StatTileData[] }) {
  return (
    <Grid
      fillWidth
      gap="16"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}
    >
      {items.map((item) => (
        <Column
          key={item.label}
          gap="12"
          padding="16"
          radius="l"
          border="neutral-medium"
          background="surface"
          minWidth={0}
        >
          <Flex gap="8" vertical="center">
            <Icon name={item.icon} size="s" onBackground="brand-strong" />
            <Text variant="label-default-s" onBackground="neutral-weak">
              {item.label}
            </Text>
          </Flex>
          <Text variant="heading-strong-l" style={{ fontVariantNumeric: "tabular-nums" }}>
            {item.value}
          </Text>
          {item.hint && (
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {item.hint}
            </Text>
          )}
        </Column>
      ))}
    </Grid>
  );
}
