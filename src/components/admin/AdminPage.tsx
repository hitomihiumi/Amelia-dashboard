import React, { type ReactNode } from "react";
import { Column } from "@once-ui-system/core";
import { PageHeader } from "@/components/layout/PageHeader";

interface AdminPageProps {
  title: string;
  description?: string;
  /** Buttons aligned to the right of the title. */
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * Page frame used by every admin screen: the shared page header, then the content. The width
 * comes from `AppShell` (the content column), so every screen uses the room next to the sidebar.
 */
export function AdminPage({ title, description, actions, badge, children }: AdminPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} actions={actions} badge={badge} />
      {children}
    </>
  );
}

/** Bordered surface used for every block inside an admin screen. */
export function AdminCard({
  children,
  padding = "24",
  gap = "16",
  fillHeight,
}: {
  children: ReactNode;
  padding?: "16" | "20" | "24" | "32";
  gap?: "8" | "12" | "16" | "24";
  /** Grow to the height of the parent column, so cards of one grid row share a height. */
  fillHeight?: boolean;
}) {
  return (
    <Column
      fillWidth
      flex={fillHeight ? 1 : undefined}
      gap={gap}
      padding={padding}
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      {children}
    </Column>
  );
}
