import { Column, Grid } from "@once-ui-system/core";
import type { ReactNode } from "react";
import styles from "./SectionGrid.module.scss";

/**
 * Lays settings cards out in columns according to the room the page really has (the `page`
 * container of `AppShell`): one column on phones and narrow tablets, two next to a sidebar on
 * wide tablets and desktops, and optionally three on very wide screens.
 *
 * Cards that need the whole row (tables, builders, long lists) pass `span="full"` to
 * `Section`, or wrap themselves in `<SectionGrid.Full>`.
 */
export function SectionGrid({
  children,
  columns = 2,
  gap = "24",
}: {
  children: ReactNode;
  /** Most columns on the widest screens. */
  columns?: 1 | 2 | 3;
  gap?: "16" | "24";
}) {
  return (
    <Grid
      fillWidth
      minWidth={0}
      gap={gap}
      className={`${styles.grid} ${styles[`cols${columns}`]}`}
    >
      {children}
    </Grid>
  );
}

function Full({ children }: { children: ReactNode }) {
  return (
    <Column minWidth={0} className={styles.full}>
      {children}
    </Column>
  );
}

SectionGrid.Full = Full;
