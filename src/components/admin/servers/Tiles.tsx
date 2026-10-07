import React from "react";
import { Column, Text } from "@once-ui-system/core";
import styles from "./Servers.module.scss";

export interface TileData {
  label: string;
  value: string;
  hint?: string;
}

export function Tiles({ items }: { items: TileData[] }) {
  return (
    <div className={styles.tiles}>
      {items.map((item) => (
        <Column
          key={item.label}
          gap="4"
          padding="16"
          radius="l"
          border="neutral-medium"
          background="surface"
          minWidth={0}
        >
          <Text variant="label-default-s" onBackground="neutral-weak">
            {item.label}
          </Text>
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
    </div>
  );
}
