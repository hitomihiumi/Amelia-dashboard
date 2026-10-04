import { Column, Flex } from "@once-ui-system/core";
import type { ReactNode } from "react";
import styles from "./AppShell.module.scss";

/**
 * Side navigation next to the page content. Stays side by side on everything wider than a
 * phone (the sidebar is sticky there); on phones the sidebar becomes a drawer and the
 * content simply fills the width.
 *
 * The content column is a size container named `page`: settings pages lay themselves out
 * with `@container page (min-width: …)` against the room that is really left next to the
 * sidebar, not against the viewport.
 */
export function AppShell({
  sidebar,
  children,
  contentMaxWidth,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  /** Overrides the default cap of the page content, e.g. "var(--responsive-width-m)". */
  contentMaxWidth?: string;
}) {
  return (
    // Grows with the page so the sticky sidebar has room to stay in view while it scrolls.
    <Flex fillWidth vertical="start" minHeight="100vh" className={styles.shell}>
      {sidebar}
      <Flex flex="1" minWidth={0} horizontal="center">
        <Column
          fillWidth
          minWidth={0}
          paddingTop="32"
          paddingX="32"
          paddingBottom="40"
          gap="24"
          m={{ paddingTop: "24", paddingX: "24", paddingBottom: "24" }}
          className={styles.inner}
          style={contentMaxWidth ? { maxWidth: contentMaxWidth } : undefined}
        >
          {children}
        </Column>
      </Flex>
    </Flex>
  );
}
