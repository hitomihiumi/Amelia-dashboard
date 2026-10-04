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
    <div className={styles.shell}>
      {sidebar}
      <div className={styles.content}>
        <div className={styles.inner} style={contentMaxWidth ? { maxWidth: contentMaxWidth } : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
