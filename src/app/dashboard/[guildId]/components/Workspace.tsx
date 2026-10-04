import { Column, Grid, Row, Text } from "@once-ui-system/core";
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
    <Grid fillWidth className={`${styles.workspace} ${asideSize === "narrow" ? styles.workspaceWide : ""}`}>
      <Column fillWidth gap="16">
        {children}
      </Column>
      <Column as="aside" minWidth="0" className={styles.aside}>
        {aside}
      </Column>
    </Grid>
  );
}

/** Editor surface (a card with the same chrome as `Section`). */
export function WorkspaceCard({ children }: { children: ReactNode }) {
  return (
    <Column
      fillWidth
      gap="16"
      padding="24"
      border="neutral-medium"
      radius="l"
      background="surface"
      className={styles.card}
    >
      {children}
    </Column>
  );
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
    <Column
      as="section"
      aria-label={title}
      fillWidth
      minHeight="0"
      border="neutral-medium"
      radius="l"
      background="surface"
      overflow="hidden"
      style={{ maxHeight: "inherit" }}
    >
      <Row
        as="header"
        fillWidth
        horizontal="between"
        vertical="center"
        wrap
        gap="8"
        paddingX="16"
        paddingY="12"
        borderBottom="neutral-weak"
        style={{ columnGap: "var(--static-space-12)" }}
      >
        <Row fitWidth vertical="center" gap="8">
          {icon ?? <LuEye size={16} aria-hidden />}
          <Text variant="label-strong-s">{title}</Text>
        </Row>
        {meta ? (
          <Row vertical="center" wrap gap="8" minWidth="0">
            {meta}
          </Row>
        ) : null}
      </Row>
      {toolbar ? (
        <Column fillWidth paddingX="16" paddingY="8" borderBottom="neutral-weak">
          {toolbar}
        </Column>
      ) : null}
      <Column
        ref={bodyRef}
        fillWidth
        gap="16"
        padding="16"
        minHeight="0"
        overflowY="auto"
        className={styles.paneBody}
      >
        {children}
      </Column>
    </Column>
  );
}

/** Intentional empty state of a preview pane. */
export function PreviewEmpty({ title, text }: { title: string; text?: string }) {
  return (
    <Column
      fillWidth
      center
      gap="8"
      padding="24"
      border="neutral-medium"
      borderStyle="dashed"
      radius="m"
      background="neutral-alpha-weak"
      onBackground="neutral-weak"
      className={styles.paneEmpty}
    >
      <LuEye size={26} aria-hidden style={{ marginBottom: "var(--static-space-4)", opacity: 0.8 }} />
      <Text variant="body-strong-s" align="center">
        {title}
      </Text>
      {text ? (
        <Text
          variant="body-default-s"
          onBackground="neutral-weak"
          align="center"
          wrap="balance"
          style={{ maxWidth: "42ch" }}
        >
          {text}
        </Text>
      ) : null}
    </Column>
  );
}
