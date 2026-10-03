import { Flex, RevealFx, Row, Text } from "@once-ui-system/core";
import type { ReactNode } from "react";
import styles from "./PageHeader.module.scss";

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
      <div className={styles.header}>
        <Flex direction="column" gap="8" className={styles.text}>
          <Row gap="12" vertical="center" wrap>
            <Text variant="heading-strong-l">{title}</Text>
            {badge}
          </Row>
          {description && (
            <Text variant="body-default-m" onBackground="neutral-medium" className={styles.description}>
              {description}
            </Text>
          )}
        </Flex>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </RevealFx>
  );
}
