import { Flex, RevealFx, Row, Text } from "@once-ui-system/core";
import type { ReactNode } from "react";

/**
 * Title block of a settings page. `actions` sit on the right of the title next to wide
 * screens and drop below it on narrow ones.
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Small chip next to the title (counts, status). */
  badge?: ReactNode;
}) {
  return (
    <RevealFx translateY={-0.5} fillWidth>
      <Flex
        fillWidth
        horizontal="between"
        vertical="end"
        gap="24"
        s={{ direction: "column", horizontal: "stretch", gap: "16" }}
      >
        <Flex direction="column" gap="8" minWidth={0}>
          <Row gap="12" vertical="center" wrap>
            <Text variant="heading-strong-l">{title}</Text>
            {badge}
          </Row>
          {description && (
            <Text variant="body-default-m" onBackground="neutral-medium" style={{ maxWidth: "72ch" }}>
              {description}
            </Text>
          )}
        </Flex>
        {actions && (
          <Row wrap vertical="center" gap="8" style={{ flexShrink: 0 }}>
            {actions}
          </Row>
        )}
      </Flex>
    </RevealFx>
  );
}
