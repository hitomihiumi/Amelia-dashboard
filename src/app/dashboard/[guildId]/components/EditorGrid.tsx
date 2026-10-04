import { Grid } from "@once-ui-system/core";
import type { ReactNode } from "react";
import styles from "./Editors.module.scss";

/**
 * Editor forms use the width of the editor pane: short fields sit side by side when there is room
 * and stack when there is not. A field that needs the whole row takes `styles.full` (Editors.module.scss).
 */
export function EditorGrid({ children }: { children: ReactNode }) {
  return (
    <Grid
      fillWidth
      gap="16"
      className={styles.cells}
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        alignItems: "start",
      }}
    >
      {children}
    </Grid>
  );
}

/** Repeating items (options, fields): as many columns as fit, an opened item grows downward. */
export function EditorList({ children }: { children: ReactNode }) {
  return (
    <Grid
      fillWidth
      gap="12"
      className={styles.cells}
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
        alignItems: "start",
      }}
    >
      {children}
    </Grid>
  );
}
