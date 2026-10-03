import { Text } from "@once-ui-system/core";
import type { ReactNode, Ref } from "react";
import { LuEye } from "react-icons/lu";
import styles from "./Workspace.module.scss";

/**
 * Editor + preview workspace shared by Components, the scenario editor and Send.
 * Next to the sidebar it shows two panes (the preview sticks while the editor scrolls); on narrow
 * pages the preview stacks below the editor. Switches follow the `page` container of `AppShell`.
 */
export function Workspace({
  children,
  aside,
  asideSize = "default",
}: {
  children: ReactNode;
  aside: ReactNode;
  /** `narrow` gives the aside a bit less room (scenario editor: the canvas wants it). */
  asideSize?: "default" | "narrow";
}) {
  return (
    <div className={`${styles.workspace} ${asideSize === "narrow" ? styles.workspaceWide : ""}`}>
      <div className={styles.main}>{children}</div>
      <aside className={styles.aside}>{aside}</aside>
    </div>
  );
}

/** Editor surface (a card with the same chrome as `Section`). */
export function WorkspaceCard({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}

/** Right-hand pane with a header; its body scrolls when the pane would not fit the viewport. */
export function PreviewPane({
  title,
  icon,
  meta,
  toolbar,
  bodyRef,
  children,
}: {
  title: string;
  /** Leading icon of the header; an eye by default. */
  icon?: ReactNode;
  /** Right side of the header (name of the previewed item, ...). */
  meta?: ReactNode;
  /** Pinned under the header, outside the scrolling body (budget bars, ...). */
  toolbar?: ReactNode;
  /** The scrolling body, for callers that keep a selected element in view. */
  bodyRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <section className={styles.pane} aria-label={title}>
      <header className={styles.paneHeader}>
        <span className={styles.paneTitle}>
          {icon ?? <LuEye size={16} aria-hidden />}
          <Text variant="label-strong-s">{title}</Text>
        </span>
        {meta ? <div className={styles.paneMeta}>{meta}</div> : null}
      </header>
      {toolbar ? <div className={styles.paneToolbar}>{toolbar}</div> : null}
      <div className={styles.paneBody} ref={bodyRef}>
        {children}
      </div>
    </section>
  );
}

/** Intentional empty state of a preview pane. */
export function PreviewEmpty({ title, text }: { title: string; text?: string }) {
  return (
    <div className={styles.paneEmpty}>
      <LuEye size={26} aria-hidden />
      <Text variant="body-strong-s">{title}</Text>
      {text ? (
        <Text variant="body-default-s" onBackground="neutral-weak" className={styles.paneEmptyText}>
          {text}
        </Text>
      ) : null}
    </div>
  );
}
