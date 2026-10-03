import React, { type ReactNode } from "react";
import { Column, Flex, Row, Text } from "@once-ui-system/core";

interface AdminPageProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons aligned to the right of the title. */
  actions?: ReactNode;
  /** Content column width; editors use "xl", lists the default. */
  width?: "m" | "l" | "xl";
  children: ReactNode;
}

const MAX_WIDTH = { m: 48, l: 64, xl: 80 } as const;

/** Page frame used by every admin screen: title row, optional actions, centered content. */
export function AdminPage({ title, description, actions, width = "l", children }: AdminPageProps) {
  return (
    <Flex fillWidth horizontal="center">
      <Column fillWidth gap="24" style={{ maxWidth: `${MAX_WIDTH[width]}rem`, minWidth: 0 }}>
        <Row fillWidth horizontal="between" vertical="center" gap="16" wrap>
          <Column gap="4" style={{ minWidth: 0 }}>
            <Text variant="heading-strong-xl" as="h1">
              {title}
            </Text>
            {description && (
              <Text variant="body-default-m" onBackground="neutral-weak">
                {description}
              </Text>
            )}
          </Column>
          {actions && (
            <Row gap="8" vertical="center" wrap>
              {actions}
            </Row>
          )}
        </Row>
        {children}
      </Column>
    </Flex>
  );
}

/** Bordered surface used for every block inside an admin screen. */
export function AdminCard({
  children,
  padding = "24",
  gap = "16",
}: {
  children: ReactNode;
  padding?: "16" | "20" | "24" | "32";
  gap?: "8" | "12" | "16" | "24";
}) {
  return (
    <Flex
      direction="column"
      fillWidth
      gap={gap}
      padding={padding}
      radius="l"
      border="neutral-medium"
      background="surface"
      style={{ minWidth: 0 }}
    >
      {children}
    </Flex>
  );
}
